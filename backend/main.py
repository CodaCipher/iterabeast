import os
import json
import random
import re
import math
import aiohttp
import asyncio
import traceback
import numpy as np
from collections import deque
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich.live import Live
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
import pyfiglet

# Initialize Rich Console
console = Console()

# Load environment variables
load_dotenv()

# Try to import sentence-transformers
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global constants and config
EMBEDDING_MODEL = None
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.90"))
ENABLE_SIMILARITY_CHECK = os.getenv("ENABLE_SIMILARITY_CHECK", "true").lower() not in {"false", "0", "no"}
ENABLE_SEMANTIC_VARIATIONS = os.getenv("ENABLE_SEMANTIC_VARIATIONS", "true").lower() not in {"false", "0", "no"}
SEMANTIC_KEYWORD_THRESHOLD = float(os.getenv("SEMANTIC_KEYWORD_THRESHOLD", "0.35"))
PROMPT_LEAK_SIM_THRESHOLD = float(os.getenv("PROMPT_LEAK_SIM_THRESHOLD", "0.92"))
FORMATTER_ENABLED = os.getenv("FORMATTER_ENABLED", "true").lower() not in {"false", "0", "no"}
FORMATTER_BASE_URL = os.getenv("FORMATTER_BASE_URL", "http://localhost:11434/api/generate")
FORMATTER_MODEL = os.getenv("FORMATTER_MODEL", "gemma3:270m-instruct-q4")
FORMATTER_TIMEOUT = int(os.getenv("FORMATTER_TIMEOUT", "60"))
FORMATTER_SYSTEM_PROMPT = os.getenv(
    "FORMATTER_SYSTEM_PROMPT",
    (
        "You are a deterministic JSON Lines formatter. "
        "Given a raw model response, output exactly one compact JSON object with schema "
        "{\"messages\": [{\"role\":\"user\",\"content\":...},{\"role\":\"assistant\",\"content\":...}]}. "
        "Do not add explanations, markdown, or extra whitespace."
    )
)

RECENT_DUPLICATE_WINDOW = max(int(os.getenv("RECENT_DUPLICATE_WINDOW", "3")), 0)
DUPLICATE_TEMP_STEP = float(os.getenv("DUPLICATE_TEMP_STEP", "0.03"))
DUPLICATE_TEMP_MAX = float(os.getenv("DUPLICATE_TEMP_MAX", "0.12"))
DUPLICATE_FREQ_STEP = float(os.getenv("DUPLICATE_FREQ_STEP", "0.03"))
DUPLICATE_FREQ_MAX = float(os.getenv("DUPLICATE_FREQ_MAX", "0.12"))
DEFAULT_PROVIDER_TEMPERATURE = float(os.getenv("DEFAULT_PROVIDER_TEMPERATURE", "0.8"))

PROMPT_LEAK_PREFIXES = (
    "scenario:",
    "objective:",
    "generate item",
    "variation_keyword",
    "variation keyword",
)

# Professional NERV/GITShell Style Logger
class NervLogger:
    HEADER = 'bold magenta'
    BLUE = 'bold blue'
    CYAN = 'bold cyan'
    GREEN = 'bold green'
    WARNING = 'bold yellow'
    FAIL = 'bold red'
    
    @staticmethod
    def _timestamp():
        return datetime.now().strftime("%H:%M:%S.%f")[:-3]

    @staticmethod
    def info(msg, tag="SYSTEM"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[{tag}] ", style=NervLogger.BLUE)
        text.append(str(msg))
        console.print(text)

    @staticmethod
    def success(msg, tag="SYNC"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[{tag}] ", style=NervLogger.GREEN)
        text.append(str(msg), style="bold white")
        console.print(text)

    @staticmethod
    def warn(msg, tag="CORE"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[{tag}] ", style=NervLogger.WARNING)
        text.append(str(msg))
        console.print(text)

    @staticmethod
    def error(msg, tag="HALT"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[{tag}] ", style=NervLogger.FAIL)
        text.append(str(msg), style="bold")
        console.print(text)

    @staticmethod
    def debug(msg, tag="DEBUG"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[{tag}] ", style=NervLogger.HEADER)
        text.append(str(msg), style="italic")
        console.print(text)

    @staticmethod
    def model(msg, model_name="LLM"):
        text = Text()
        text.append(f"[{NervLogger._timestamp()}] ", style=NervLogger.CYAN)
        text.append(f"[MODEL::{model_name}] ", style=NervLogger.HEADER)
        text.append(str(msg))
        console.print(text)

    @staticmethod
    def banner():
        ascii_banner = pyfiglet.figlet_format("ITERA\nBEAST", font="slant")
        panel = Panel(
            Text(ascii_banner, style="bold red"),
            title="[bold white]SYNTH_DATAGEN_ENGINE[/]",
            subtitle="[bold cyan]iterabeast@terminal v0.4[/]",
            border_style="red",
            padding=(1, 2),
            expand=False
        )
        console.print("\n")
        console.print(panel)
        console.print("[dim white]" + "="*80 + "[/]\n")

    @staticmethod
    def report(title: str, data: Dict[str, Any], style="cyan"):
        from rich.table import Table
        table = Table(show_header=False, border_style=style, box=None, padding=(0, 2))
        for k, v in data.items():
            table.add_row(f"[bold {style}]{k}[/]", f"[white]{v}[/]")
        
        panel = Panel(
            table,
            title=f"[bold white]{title}[/]",
            border_style=style,
            expand=False
        )
        console.print(panel)

    @staticmethod
    def mission_complete(
        total: int,
        ok: int,
        failed: int,
        provider_stats: Dict[str, int],
        elapsed_sec: float,
        output_path: str,
        distribution: str,
    ):
        from rich.table import Table
        from rich.rule import Rule
        from rich.columns import Columns

        status_color = "bold green" if failed == 0 else ("bold yellow" if ok > 0 else "bold red")
        status_text  = "MISSION COMPLETE" if failed == 0 else ("PARTIAL SUCCESS" if ok > 0 else "MISSION FAILED")

        # ── top rule ──────────────────────────────────────────────────────────
        console.print()
        console.print(Rule(f"[bold red]// SYNTH_DATAGEN_ENGINE :: OPERATION DEBRIEF //[/]", style="red"))

        # ── stat grid ─────────────────────────────────────────────────────────
        stat_table = Table(show_header=False, box=None, padding=(0, 3), expand=False)
        stat_table.add_column(justify="right",  style="bold cyan",   no_wrap=True)
        stat_table.add_column(justify="left",   style="white",       no_wrap=True)
        stat_table.add_column(justify="right",  style="bold cyan",   no_wrap=True)
        stat_table.add_column(justify="left",   style="white",       no_wrap=True)

        rate = (ok / total * 100) if total > 0 else 0
        bar_filled = int(rate / 5)
        bar = f"[green]{'█' * bar_filled}[/][dim]{'░' * (20 - bar_filled)}[/]"

        stat_table.add_row("TOTAL DISPATCHED", str(total),  "ELAPSED",      f"{elapsed_sec:.1f}s")
        stat_table.add_row("SECURED",          f"[bold green]{ok}[/]",
                           "FAILED",           f"[bold red]{failed}[/]" if failed else f"[dim]{failed}[/]")
        stat_table.add_row("SUCCESS RATE",     f"{rate:.1f}%",
                           "DISTRIBUTION",     distribution.upper())
        stat_table.add_row("THROUGHPUT",       f"{ok / elapsed_sec:.2f} items/s" if elapsed_sec > 0 else "—",
                           "OUTPUT",           f"[dim]{output_path}[/]")

        # ── provider breakdown ────────────────────────────────────────────────
        prov_table = Table(show_header=True, box=None, padding=(0, 2), expand=False,
                           header_style="bold magenta")
        prov_table.add_column("PROVIDER",  style="cyan",  no_wrap=True)
        prov_table.add_column("SECURED",   style="green", justify="right")
        for pname, pcount in sorted(provider_stats.items(), key=lambda x: -x[1]):
            short = pname.split("/")[-1]
            prov_table.add_row(short, str(pcount))

        # ── main panel ────────────────────────────────────────────────────────
        from rich.text import Text as RText
        title_text = RText()
        title_text.append("  ◈ ", style="bold red")
        title_text.append(status_text, style=status_color)
        title_text.append("  ◈  ", style="bold red")

        inner = Table.grid(padding=(0, 4))
        inner.add_column()
        inner.add_column()
        inner.add_row(stat_table, prov_table)

        console.print(
            Panel(
                inner,
                title=title_text,
                subtitle=f"[dim]{datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}[/]",
                border_style="red",
                padding=(1, 3),
                expand=False,
            )
        )
        console.print(Rule(style="dim red"))
        console.print()

log = NervLogger()

CLOTHING_VARIATIONS = [
    "casual outfit", "formal attire", "sportswear", "traditional dress",
    "uniform", "costume", "work clothes", "party outfit", "beachwear",
    "sleepwear", "everyday clothes", "special occasion attire"
]

GENERAL_VARIATIONS = [
    "morning routine", "evening activity", "work situation", "leisure time",
    "special event", "daily task", "social gathering", "private moment",
    "public appearance", "family time", "professional setting", "casual encounter"
]

USER_MESSAGE_FORMATS = [
    # Direct questions
    "The user message must be phrased as a direct question (e.g. 'What do you think about...', 'Can you help me with...', 'Why does...?').",
    "The user message must be a short, curious question in one or two sentences.",
    "The user message must open with a 'how' or 'why' question.",
    # Excited / enthusiastic
    "The user message must be written in an excited, enthusiastic tone, expressing joy or eagerness.",
    "The user message must start with an exclamation or expression of surprise (e.g. 'Oh wow!', 'No way!', 'This is amazing...').",
    # Frustrated / venting
    "The user message must be written in a frustrated or slightly annoyed tone, venting about a problem.",
    "The user message must open with a complaint or expression of struggle (e.g. 'Ugh, I keep...', 'No matter what I try...', 'I'm so tired of...').",
    # Casual / conversational
    "The user message must be very casual and conversational, like texting a friend (short sentences, informal language).",
    "The user message must feel like a relaxed, off-hand comment or observation.",
    # Descriptive / storytelling
    "The user message must briefly describe a specific situation or moment the user experienced, then ask for help or share a thought.",
    "The user message must start by setting a scene or context before getting to the point.",
    # Uncertain / seeking advice
    "The user message must express uncertainty or hesitation, as if the user is unsure and looking for guidance.",
    "The user message must open with 'I'm not sure if...' or 'I've been wondering...' or a similar hedge.",
    # Imperative / request
    "The user message must be a direct request or command (e.g. 'Tell me...', 'Give me...', 'Help me figure out...').",
    "The user message must be written as a short, decisive request with no preamble.",
    # Opinion sharing
    "The user message must start by sharing the user's personal opinion or feeling about something, then invite a response.",
    "The user message must open with 'Honestly...' or 'Personally, I think...' or 'I feel like...'.",
    # Comparative / analytical
    "The user message must compare two things or ask for a comparison (e.g. 'Which is better...', 'What's the difference between...').",
    # Reflective
    "The user message must be reflective or introspective, as if the user is thinking out loud.",
    "The user message must open with 'I've been thinking about...' or 'Lately I've noticed...'.",
    # Problem statement
    "The user message must clearly state a problem the user is facing, written as a concise problem statement.",
    "The user message must describe an obstacle or challenge using 'I need to...' or 'The issue is...'.",
    # Anecdote-led
    "The user message must start with a very short anecdote (1 sentence) about something that just happened, then transition to the main point.",
    # Hypothetical
    "The user message must pose a hypothetical scenario starting with 'What if...' or 'Imagine...'.",
]

def calculate_repetition_penalty(text: str, common_phrases: List[str]) -> float:
    """Calculate penalty for repeated phrases. Higher penalty means more repetition."""
    penalty = 0.0
    text_lower = text.lower()
    for phrase in common_phrases:
        count = text_lower.count(phrase.lower())
        if count > 1:
            penalty += (count - 1) * 0.2  # 0.2 penalty for each additional occurrence
    return min(penalty, 1.0)  # Cap at 1.0

def inject_dynamic_variations(system_prompt: str, scenario_prompt: str, item_index: int, attempt: int = 1) -> tuple[str, str]:
    """Inject random variations into both system and scenario prompts."""
    import random
    # Removed deterministic seeding for true randomness
    
    clothing = random.choice(CLOTHING_VARIATIONS)
    activity = random.choice(GENERAL_VARIATIONS)
    user_format = random.choice(USER_MESSAGE_FORMATS)
    
    def apply_vars(text):
        text = text.replace("[CLOTHING_DESCRIPTION]", clothing)
        text = text.replace("[ACTIVITY_DESCRIPTION]", activity)
        text = text.replace("[SITUATION]", activity)
        return text

    new_system = apply_vars(system_prompt)
    new_scenario = apply_vars(scenario_prompt)
    
    if "AVOID REPETITION" not in new_system.upper():
        new_system += "\n\nIMPORTANT: Avoid repetitive phrases. Each response must be unique. Vary your language."
    
    # Inject user message format directive
    new_system += f"\n\nUSER MESSAGE FORMAT DIRECTIVE: {user_format} Do NOT start the user message with 'I saw', 'I can\'t stop', 'I noticed', or any other repeated opener used in previous items."
    
    # CRITICAL: Add unique marker to prevent OpenRouter cache collision
    # When multiple providers send similar prompts simultaneously, OpenRouter may cache/deduplicate
    # Adding a unique but invisible marker ensures each request is treated independently
    unique_marker = f"\n\n<!-- Task ID: {item_index}-{attempt}-{random.randint(1000, 9999)} -->"
    new_system += unique_marker
    
    return new_system, new_scenario

def get_embedding_model():
    if SentenceTransformer is None:
        raise RuntimeError("sentence-transformers is not installed; cannot compute embeddings")

    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        print(f"Loading embedding model '{EMBEDDING_MODEL_NAME}' for similarity checks")
        EMBEDDING_MODEL = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return EMBEDDING_MODEL

class ProviderConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(random.randint(1000, 9999)))
    name: Optional[str] = "Default"
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str
    temperature: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    enabled: bool = True

class FormatterConfig(BaseModel):
    enabled: bool = False
    provider: str = "ollama"  # ollama or openrouter
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str = "gemma3:270m-instruct-q4"
    system_prompt: Optional[str] = None

class GenerationRequest(BaseModel):
    scenario: Optional[str] = None
    objective: str
    system_prompt: str
    batch_size: int
    provider_configs: List[ProviderConfig] # Support multiple providers
    formatter_config: Optional[FormatterConfig] = None
    output_filename: str
    stream: bool = False
    variations: Optional[List[str]] = None
    variation_similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    distribution_strategy: str = "round-robin"
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

class UsageInfo(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost: float = 0.0

class GenerationResponse(BaseModel):
    status: str
    message: str
    generated_count: int = 0
    errors: List[str] = []

class VariationGenerationRequest(BaseModel):
    provider_config: ProviderConfig
    count: int = Field(5, ge=1, le=200)
    system_prompt: str
    objective: str
    existing_variations: List[str] = []
    variations_prompt: Optional[str] = None

class VariationGenerationResponse(BaseModel):
    variations: List[str]

# OpenRouter Pricing (per 1M tokens)
MODEL_PRICING = {
    "x-ai/grok-4.1-fast": {"input": 0.5, "output": 1.5},
    "anthropic/claude-3.5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-opus": {"input": 15.0, "output": 75.0},
    "meta-llama/llama-3.1-405b-instruct": {"input": 2.7, "output": 2.7},
    "meta-llama/llama-3.1-70b-instruct": {"input": 0.88, "output": 0.88},
    "meta-llama/llama-3.1-8b-instruct": {"input": 0.17, "output": 0.17},
    "google/gemini-pro-1.5": {"input": 1.25, "output": 5.0},
    "openai/gpt-4o": {"input": 5.0, "output": 15.0},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},
    "deepseek/deepseek-chat": {"input": 0.2, "output": 0.2},
}

class ProviderHandler:
    # Class-level semaphore pool to limit concurrent requests per base_url
    _semaphore_pool: Dict[str, asyncio.Semaphore] = {}
    _semaphore_lock = asyncio.Lock()
    
    @classmethod
    async def _get_semaphore(cls, base_url: str) -> asyncio.Semaphore:
        """Get or create a semaphore for a given base_url to limit concurrent requests."""
        async with cls._semaphore_lock:
            if base_url not in cls._semaphore_pool:
                cls._semaphore_pool[base_url] = asyncio.Semaphore(1)
            return cls._semaphore_pool[base_url]

    def __init__(self, config: ProviderConfig):
        self.config = config
        self.provider = config.provider
        self.model = config.model
        self.temperature = config.temperature
        self.frequency_penalty = config.frequency_penalty
        self.presence_penalty = config.presence_penalty
        self._session = None
    
    async def _ensure_session(self):
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close_session(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def generate(self, system_prompt: str, user_prompt: str, sampling_overrides: Optional[Dict[str, float]] = None) -> Tuple[Optional[str], UsageInfo]:
        if self.provider == "ollama":
            content = await self._ollama(system_prompt, user_prompt, sampling_overrides)
            # Ollama doesn't provide easy token usage in this API call without streaming
            # or extra metadata. We'll estimate or leave as 0 for now as it's free.
            return content, UsageInfo()
        elif self.provider == "openrouter":
            return await self._openrouter(system_prompt, user_prompt, sampling_overrides)
        elif self.provider == "groq":
            return await self._groq(system_prompt, user_prompt, sampling_overrides)
        elif self.provider == "deepinfra":
            return await self._deepinfra(system_prompt, user_prompt, sampling_overrides)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    async def _ollama(self, sys, usr, overrides=None):
        url = f"{self.config.base_url or 'http://localhost:11434'}/api/generate"
        payload = {"model": self.config.model, "prompt": usr, "system": sys, "stream": False}
        options: Dict[str, Any] = {}
        if overrides:
            if "temperature" in overrides:
                options["temperature"] = overrides["temperature"]
            if "repeat_penalty" in overrides:
                options["repeat_penalty"] = overrides["repeat_penalty"]
            elif "frequency_penalty" in overrides:
                options["repeat_penalty"] = max(1.0, 1.05 + overrides["frequency_penalty"])
        if options:
            payload["options"] = options
        log.model(f"Calling Ollama... ({self.config.model})", self.config.model)
        try:
            sess = await self._ensure_session()
            # Reduced timeout from 300 to 60 seconds to prevent workers from hanging indefinitely on stalled requests.
            # Normal successful requests take ~10-15s, so 60s is plenty of headroom for normal operations,
            # but fails fast enough to keep the worker pool moving if Ollama locks up.
            async with sess.post(url, json=payload, timeout=60) as resp:
                    if resp.status == 200:
                        return (await resp.json()).get("response", "").strip()
                    log.error(f"Ollama reported error code: {resp.status}")
        except Exception as e:
            log.error(f"Ollama connection failure: {str(e)}")
        return None

    async def _openrouter(self, sys, usr, overrides=None):
        url = f"{self.config.base_url or 'https://openrouter.ai'}/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "Referer": "http://localhost:54421",
            "X-Title": "NERV-Synthetic-Gen"
        }
        payload = {"model": self.config.model, "messages": [{"role": "system", "content": sys}, {"role": "user", "content": usr}]}
        for k in ["temperature", "frequency_penalty", "presence_penalty"]:
            val = getattr(self.config, k)
            if val is not None: payload[k] = val
        if overrides:
            for key in ("temperature", "frequency_penalty", "presence_penalty"):
                if key in overrides:
                    payload[key] = overrides[key]

        log.model(f"Transmitting to OpenRouter uplink... ({self.config.model})", self.config.model)
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.post(url, json=payload, headers=headers, timeout=300) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content")
                        if content is None:
                            log.error(f"OpenRouter returned null content. Full response: {data}")
                            return None, UsageInfo()
                        content = content.strip()
                        usage_data = data.get("usage", {})
                        
                        usage = UsageInfo(
                            prompt_tokens=usage_data.get("prompt_tokens", 0),
                            completion_tokens=usage_data.get("completion_tokens", 0),
                            total_tokens=usage_data.get("total_tokens", 0)
                        )
                        
                        # Calculate cost
                        pricing = MODEL_PRICING.get(self.config.model)
                        if pricing:
                            usage.cost = (usage.prompt_tokens / 1_000_000 * pricing["input"]) + \
                                         (usage.completion_tokens / 1_000_000 * pricing["output"])
                        
                        return content, usage
                    body = await resp.text()
                    log.error(f"OpenRouter reported error code: {resp.status} | Body: {body[:300]}")
        except Exception as e:
            log.error(f"OpenRouter connection failure: {str(e)}")
        return None, UsageInfo()

    async def _groq(self, sys, usr, overrides=None):
        url = f"{self.config.base_url or 'https://api.groq.com/openai/v1'}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": self.config.model, "messages": [{"role": "system", "content": sys}, {"role": "user", "content": usr}]}
        for k in ["temperature", "frequency_penalty", "presence_penalty"]:
            val = getattr(self.config, k)
            if val is not None: payload[k] = val
        if overrides:
            for key in ("temperature", "frequency_penalty", "presence_penalty"):
                if key in overrides:
                    payload[key] = overrides[key]
        
        log.model(f"Transmitting to Groq API... ({self.config.model})", self.config.model)
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.post(url, json=payload, headers=headers, timeout=300) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content")
                        if content is None:
                            log.error(f"Groq returned null content. Full response: {data}")
                            return None, UsageInfo()
                        content = content.strip()
                        usage_data = data.get("usage", {})
                        
                        usage = UsageInfo(
                            prompt_tokens=usage_data.get("prompt_tokens", 0),
                            completion_tokens=usage_data.get("completion_tokens", 0),
                            total_tokens=usage_data.get("total_tokens", 0)
                        )
                        
                        # Calculate cost using Groq pricing
                        groq_pricing = {
                            "llama3-70b-8192": {"input": 0.59, "output": 0.79},
                            "llama3-8b-8192": {"input": 0.05, "output": 0.08},
                            "mixtral-8x7b-32768": {"input": 0.27, "output": 0.27},
                            "gemma-7b-it": {"input": 0.07, "output": 0.07}
                        }
                        pricing = groq_pricing.get(self.config.model)
                        if pricing:
                            usage.cost = (usage.prompt_tokens / 1_000_000 * pricing["input"]) + \
                                         (usage.completion_tokens / 1_000_000 * pricing["output"])
                        
                        return content, usage
                    body = await resp.text()
                    log.error(f"Groq reported error code: {resp.status} | Body: {body[:300]}")
        except Exception as e:
            log.error(f"Groq connection failure: {str(e)}")
    async def _deepinfra(self, sys, usr, overrides=None):
        url = f"{self.config.base_url or 'https://api.deepinfra.com/v1/openai'}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": self.config.model, "messages": [{"role": "system", "content": sys}, {"role": "user", "content": usr}]}
        for k in ["temperature", "frequency_penalty", "presence_penalty"]:
            val = getattr(self.config, k)
            if val is not None: payload[k] = val
        if overrides:
            for key in ("temperature", "frequency_penalty", "presence_penalty"):
                if key in overrides:
                    payload[key] = overrides[key]
        
        log.model(f"Transmitting to DeepInfra API... ({self.config.model})", self.config.model)
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.post(url, json=payload, headers=headers, timeout=300) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content")
                        if content is None:
                            log.error(f"DeepInfra returned null content. Full response: {data}")
                            return None, UsageInfo()
                        content = content.strip()
                        usage_data = data.get("usage", {})
                        
                        raw_cost = data.get("cost")
                        base_cost = float(raw_cost) if raw_cost is not None else 0.0

                        usage = UsageInfo(
                            prompt_tokens=usage_data.get("prompt_tokens", 0),
                            completion_tokens=usage_data.get("completion_tokens", 0),
                            total_tokens=usage_data.get("total_tokens", 0),
                            cost=base_cost
                        )
                        
                        if raw_cost is None:
                            deepinfra_pricing = {
                                "meta-llama/Llama-3.3-70B-Instruct": {"input": 0.13, "output": 0.40},
                                "Qwen/Qwen2.5-72B-Instruct": {"input": 0.12, "output": 0.40},
                                "microsoft/WizardLM-2-8x22B": {"input": 0.13, "output": 0.40},
                                "Cohere/c4ai-command-r-plus-08-2024": {"input": 0.45, "output": 0.90}
                            }
                            pricing = deepinfra_pricing.get(self.config.model)
                            if pricing:
                                usage.cost = (usage.prompt_tokens / 1_000_000 * pricing["input"]) + \
                                             (usage.completion_tokens / 1_000_000 * pricing["output"])
                            else:
                                usage.cost = 0.0
                        
                        return content, usage
                    body = await resp.text()
                    log.error(f"DeepInfra reported error code: {resp.status} | Body: {body[:300]}")
        except Exception as e:
            log.error(f"DeepInfra connection failure: {str(e)}")
        return None, UsageInfo()

        return None, UsageInfo()

def strip_prompt_prefix_lines(text: str) -> tuple[str, bool, bool]:
    removed = False
    lines = []
    fallback_chunks = []
    for line in (text or "").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()
        matched_prefix = next((prefix for prefix in PROMPT_LEAK_PREFIXES if lower.startswith(prefix)), None)
        if matched_prefix:
            removed = True
            # Try to salvage anything after the prefix (e.g., text after the colon)
            if ":" in stripped:
                _, remainder = stripped.split(":", 1)
                remainder = remainder.strip()
                if remainder:
                    fallback_chunks.append(remainder)
            continue
        lines.append(stripped)
    sanitized = " ".join(lines).strip()
    used_fallback = False
    if not sanitized and fallback_chunks:
        sanitized = " ".join(fallback_chunks).strip()
        used_fallback = True
    return sanitized, removed, used_fallback

def detect_semantic_prompt_leak(content: str, embedding_model, prompt_reference_embeddings):
    if not content or embedding_model is None or not prompt_reference_embeddings:
        return False, None, None
    try:
        content_vec = np.asarray(embedding_model.encode([content])[0], dtype=np.float32)
    except Exception as exc:
        print(f"Prompt leak encoding failed: {exc}")
        return False, None, None
    max_name = None
    max_sim = -1.0
    for name, ref_vec in prompt_reference_embeddings.items():
        denom = (np.linalg.norm(ref_vec) * np.linalg.norm(content_vec)) + 1e-8
        if denom == 0:
            continue
        sim = float(np.dot(ref_vec, content_vec) / denom)
        if sim > max_sim:
            max_sim = sim
            max_name = name
    if max_sim >= PROMPT_LEAK_SIM_THRESHOLD:
        return True, max_name, max_sim
    return False, max_name, max_sim

def sanitize_user_message(data_obj: dict, item_index: int, attempt_index: int, embedding_model, prompt_reference_embeddings) -> Optional[str]:
    if "messages" not in data_obj or not isinstance(data_obj["messages"], list):
        return None
    user_msg = None
    for msg in data_obj["messages"]:
        if isinstance(msg, dict) and msg.get("role") == "user":
            user_msg = msg
            break
    if not user_msg:
        return None
    original = user_msg.get("content", "") or ""
    sanitized, removed, used_fallback = strip_prompt_prefix_lines(original)
    if removed:
        print(f"Stripped prompt lines from user content for item {item_index+1} (attempt {attempt_index})")
        user_msg["content"] = sanitized
        if used_fallback:
            print(f"Rebuilt user content from prompt suffix for item {item_index+1} (attempt {attempt_index})")
    if not sanitized:
        print(f"User content empty after stripping for item {item_index+1} (attempt {attempt_index})")
        return None
    leak, ref_name, sim = detect_semantic_prompt_leak(sanitized, embedding_model, prompt_reference_embeddings)
    if leak:
        ref_label = ref_name or "prompt"
        print(f"Semantic prompt leakage detected vs {ref_label} (sim={sim:.3f}) for item {item_index+1} (attempt {attempt_index})")
        return None
    return sanitized

def extract_user_text(data_obj: dict) -> str:
    try:
        messages = data_obj.get("messages")
        if not isinstance(messages, list) or not messages:
            return ""
        for msg in messages:
            if isinstance(msg, dict) and msg.get("role") == "user":
                content = msg.get("content", "")
                return content if isinstance(content, str) else ""
    except Exception as exc:
        print(f"User text extraction error: {exc}")
    return ""

def _strip_keyword_instances(text: str, keyword: str) -> str:
    if not text or not keyword:
        return text or ""
    pattern = re.compile(re.escape(keyword), flags=re.IGNORECASE)
    return pattern.sub(" ", text)

def user_message_matches_keyword(data_obj: dict, keyword: Optional[str], embedding_model, semantic_variations_enabled, variation_semantic_threshold):
    if not keyword:
        return True, None
    try:
        content = extract_user_text(data_obj)
        if not content:
            return False, None
        literal_present = keyword.lower() in content.lower()

        if not semantic_variations_enabled or embedding_model is None:
            # Without semantic engine we can only rely on literal inclusion
            return (literal_present, None)

        comparison_text = content
        if literal_present:
            stripped = _strip_keyword_instances(content, keyword).strip()
            if not stripped:
                # Content was essentially just the keyword; reject to avoid trivial passes
                return False, None
            comparison_text = stripped

        keyword_vec = np.asarray(embedding_model.encode([keyword])[0], dtype=np.float32)
        content_vec = np.asarray(embedding_model.encode([comparison_text])[0], dtype=np.float32)
        denom = (np.linalg.norm(keyword_vec) * np.linalg.norm(content_vec)) + 1e-8
        if denom == 0:
            return False, None
        sim = float(np.dot(keyword_vec, content_vec) / denom)
        if sim >= variation_semantic_threshold:
            # Require either literal presence or strong semantic alignment
            if literal_present or not keyword:
                return True, sim
        return False, sim
    except Exception as exc:
        print(f"Keyword validation error: {exc}")
        return False, None

def extract_assistant_text(data_obj: dict) -> str:
    try:
        messages = data_obj.get("messages", [])
        if isinstance(messages, list):
            for msg in messages:
                if isinstance(msg, dict) and msg.get("role") == "assistant":
                    content = msg.get("content", "")
                    return content if isinstance(content, str) else ""
    except Exception as exc:
        print(f"Assistant extraction error: {exc}")
    return ""

def check_similarity(text: str, similarity_enabled, embedding_model, assistant_embeddings):
    if not similarity_enabled or embedding_model is None:
        return False, None, None
    cleaned = (text or "").strip()
    if not cleaned:
        return False, None, None
    vector = np.asarray(embedding_model.encode([cleaned])[0], dtype=np.float32)
    if not assistant_embeddings:
        return False, None, vector
    norm_vector = np.linalg.norm(vector) + 1e-8
    max_sim = -1.0
    for emb in assistant_embeddings:
        denom = (np.linalg.norm(emb) * norm_vector) + 1e-8
        if denom == 0:
            continue
        sim = float(np.dot(emb, vector) / denom)
        if sim > max_sim:
            max_sim = sim
    return (max_sim >= SIMILARITY_THRESHOLD, max_sim if max_sim >= 0 else None, vector)

def adjust_sampling_for_duplicate(config: ProviderConfig, duplicate_hits: int) -> Dict[str, float]:
    """Return gentle sampling overrides when semantic duplicates keep appearing."""
    overrides: Dict[str, float] = {}
    if duplicate_hits <= 0:
        return overrides
    temp_base = config.temperature if config.temperature is not None else DEFAULT_PROVIDER_TEMPERATURE
    temp_delta = min(DUPLICATE_TEMP_STEP * duplicate_hits, DUPLICATE_TEMP_MAX)
    overrides["temperature"] = max(0.1, min(1.5, temp_base + temp_delta))

    freq_base = config.frequency_penalty if config.frequency_penalty is not None else 0.0
    freq_delta = min(DUPLICATE_FREQ_STEP * duplicate_hits, DUPLICATE_FREQ_MAX)
    overrides["frequency_penalty"] = freq_base + freq_delta
    return overrides

def update_recent_buffer(buffer: deque, vector: np.ndarray):
    if buffer is not None and vector is not None:
        buffer.append(vector)

def recent_duplicate_check(vector: np.ndarray, buffer: deque, threshold: float) -> Tuple[bool, Optional[float]]:
    if buffer is None or vector is None or not buffer:
        return False, None
    vec_norm = np.linalg.norm(vector) + 1e-8
    max_sim = -1.0
    for prev in buffer:
        denom = (np.linalg.norm(prev) * vec_norm) + 1e-8
        if denom == 0:
            continue
        sim = float(np.dot(prev, vector) / denom)
        if sim > max_sim:
            max_sim = sim
    if max_sim >= threshold:
        return True, max_sim
    return False, max_sim if max_sim >= 0 else None

def validate_json_structure(data: dict, item_index: int, attempt: int) -> tuple[bool, Optional[str]]:
    """Validate that the JSON structure is correct.
    Returns (is_valid, error_message).
    """
    if not isinstance(data, dict) or "messages" not in data:
        err = f"Invalid structure: missing 'messages' field in item {item_index+1} (attempt {attempt})"
        print(err)
        return False, err
    
    if not isinstance(data["messages"], list):
        err = f"Invalid structure: 'messages' is not a list in item {item_index+1} (attempt {attempt})"
        print(err)
        return False, err
    
    messages = data["messages"]
    if len(messages) != 2:
        err = f"Invalid structure: expected exactly 2 messages, got {len(messages)} in item {item_index+1} (attempt {attempt})"
        print(err)
        return False, err
    
    user_count = 0
    assistant_count = 0
    
    for i, msg in enumerate(messages):
        if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
            err = f"Invalid message structure at index {i} in item {item_index+1} (attempt {attempt})"
            print(err)
            return False, err
        
        role = msg.get("role")
        content = msg.get("content", "")
        
        if role == "user":
            user_count += 1
            if not isinstance(content, str) or not content.strip():
                err = f"Empty user message content in item {item_index+1} (attempt {attempt})"
                print(err)
                return False, err
        elif role == "assistant":
            assistant_count += 1
            if not isinstance(content, str) or not content.strip():
                err = f"Empty assistant message content in item {item_index+1} (attempt {attempt})"
                print(err)
                return False, err
            
            # Check for nested JSON in assistant content
            content_stripped = content.strip()
            if (content_stripped.startswith('{') and content_stripped.endswith('}') and 
                '"messages"' in content_stripped):
                err = f"Nested JSON detected in assistant content for item {item_index+1} (attempt {attempt})"
                print(err)
                return False, err
        else:
            err = f"Invalid role '{role}' in message at index {i} in item {item_index+1} (attempt {attempt})"
            print(err)
            return False, err
    
    if user_count != 1:
        err = f"Expected exactly 1 user message, found {user_count} in item {item_index+1} (attempt {attempt})"
        print(err)
        return False, err
    
    if assistant_count != 1:
        err = f"Expected exactly 1 assistant message, found {assistant_count} in item {item_index+1} (attempt {attempt})"
        print(err)
        return False, err
    
    return True, None

async def call_formatter_service(raw_text: str, fallback_user_content: str, config: FormatterConfig) -> Optional[str]:
    if not config.enabled:
        return None

    system_p = config.system_prompt or (
        "You are a JSON formatter. Convert the input to valid JSON with schema: "
        "{\"messages\":[{\"role\":\"user\",\"content\":\"...\"},{\"role\":\"assistant\",\"content\":\"...\"}]}. "
        "Output ONLY the JSON object. No markdown, no explanations, no greetings."
    )

    prompt = (
        "Input text:\n" + raw_text + "\n\n"
        "Fallback user content: " + (fallback_user_content or "") + "\n\n"
        "Task: Extract user and assistant messages, format as JSON with exactly 2 messages.\n"
        "Output only JSON: {\"messages\":[{\"role\":\"user\",\"content\":\"...\"},{\"role\":\"assistant\",\"content\":\"...\"}]}"
    )

    if config.provider == "ollama":
        url = f"{config.base_url or 'http://localhost:11434'}/api/generate"
        payload = {
            "model": config.model,
            "system": system_p,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0, "num_predict": 512}
        }
    else:  # openrouter
        url = f"{config.base_url or 'https://openrouter.ai'}/api/v1/chat/completions"
        payload = {
            "model": config.model,
            "messages": [
                {"role": "system", "content": system_p},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0,
            "max_tokens": 512
        }

    log.info(f"Dispatching payload to formatter core ({config.provider}::{config.model}).", "FORMATTER")
    headers = {}
    if config.provider == "openrouter" and config.api_key:
        headers["Authorization"] = f"Bearer {config.api_key}"

    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(url, json=payload, headers=headers, timeout=60) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    candidate = None
                    if config.provider == "ollama":
                        candidate = data.get("response")
                    else:
                        candidate = data.get("choices", [{}])[0].get("message", {}).get("content")

                    if isinstance(candidate, str):
                        log.success("Formatter returned normalized payload.", "FORMATTER")
                        return candidate.strip()
                    log.warn(f"Formatter response in unexpected format", "FORMATTER")
                else:
                    body = await resp.text()
                    log.warn(f"Formatter HTTP {resp.status}: {body}", "FORMATTER")
    except Exception as exc:
        log.error(f"Formatter failure: {exc}", "FORMATTER")
    return None

def _extract_first_json_object(raw_text: str) -> Optional[str]:
    if not raw_text:
        return None
    start = raw_text.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for idx in range(start, len(raw_text)):
        ch = raw_text[idx]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw_text[start:idx + 1]
    return None

async def normalize_model_response(text: str, fallback_user_content: str, config: Optional[FormatterConfig]) -> Optional[dict]:
    if not text:
        return None
    text = text.strip()
    if not text:
        return None
    
    # Clean markdown code blocks FIRST (before any parsing attempts)
    if text.startswith('```json'):
        text = text[7:]
    elif text.startswith('```jsonl'):
        text = text[8:]
    elif text.startswith('```'):
        text = text[3:]
    
    if text.endswith('```'):
        text = text[:-3]
    
    text = text.strip()
    
    import re
    
    # Remove reasoning traces from thinking models (e.g. <think>...</think>)
    reasoning_patterns = [
        r"(?is)<think>.*?</think>",
        r"(?is)<thinking>.*?</thinking>",
        r"(?is)<reasoning>.*?</reasoning>",
    ]
    removed_reasoning = False
    for pattern in reasoning_patterns:
        text, removed_count = re.subn(pattern, "", text)
        if removed_count:
            removed_reasoning = True
    text = text.strip()
    if removed_reasoning:
        log.debug("Removed reasoning trace blocks before JSON parsing.", "FORMATTER")

    parse_candidates = []
    extracted_json = _extract_first_json_object(text)
    if extracted_json:
        extracted_json = extracted_json.strip()
        parse_candidates.append(extracted_json)
        if extracted_json != text:
            log.debug("Extracted JSON object from mixed model output.", "FORMATTER")
    if text and text not in parse_candidates:
        parse_candidates.append(text)

    # Try direct parsing first
    direct_parsed = None
    parse_error = None
    for candidate in parse_candidates:
        # Fix: {"role": "user", {"content": -> {"role": "user", "content":
        candidate = re.sub(r'("role"\s*:\s*"[^"]+"),\s*\{("content")', r'\1, \2', candidate)
        try:
            direct = json.loads(candidate)
        except json.JSONDecodeError as e:
            parse_error = str(e)
            continue

        if isinstance(direct, dict):
            # Check if the content is meaningful (not just "...")
            messages = direct.get("messages", [])
            
            # Accept JSON if it has the correct structure (2 messages with user and assistant roles)
            if (len(messages) == 2 and 
                messages[0].get("role") == "user" and 
                messages[1].get("role") == "assistant" and
                messages[0].get("content", "").strip() and
                messages[1].get("content", "").strip()):
                log.debug("Direct JSON parsing successful, bypassing formatter", "FORMATTER")
                return direct
            
            # Only check for placeholder content if structure is wrong
            if messages and all(
                msg.get("content", "").strip() not in ["...", "", "."]
                for msg in messages
                if isinstance(msg, dict)
            ):
                log.debug("Direct JSON has content but wrong structure, will try formatter", "FORMATTER")
                direct_parsed = direct  # Save for fallback
            else:
                log.debug("Direct JSON valid but content is empty/placeholder, will try formatter", "FORMATTER")
                direct_parsed = direct  # Save for fallback
    if parse_error:
        log.debug(f"Direct JSON parsing failed: {parse_error}", "FORMATTER")

    if not config or not config.enabled:
        # If formatter is disabled but we have valid direct JSON, use it
        if direct_parsed:
            log.debug("Formatter disabled, using direct parsed JSON", "FORMATTER")
            return direct_parsed
        return None

    log.info("Initializing response normalization sequence.", "FORMATTER")
    formatted = await call_formatter_service(text, fallback_user_content, config)
    
    # If formatter failed but we have valid direct JSON, use it as fallback
    if not formatted and direct_parsed:
        log.warn("Formatter failed, falling back to direct parsed JSON", "FORMATTER")
        return direct_parsed
    
    if formatted:
        # Clean up the formatter output
        cleaned = formatted.strip()
        
        # Remove markdown code blocks if present
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]  # Remove ```json
        elif cleaned.startswith('```jsonl'):
            cleaned = cleaned[8:]  # Remove ```jsonl
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:]  # Remove ```
        
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]  # Remove ending ```
        
        cleaned = cleaned.strip()
        
        # Try to extract JSON from the response
        # Handle cases where there might be multiple JSON objects or extra text
        import re
        
        # Find JSON objects in the text
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, cleaned, re.DOTALL)
        
        # Try each match until we find a valid one
        for match in matches:
            try:
                data = json.loads(match)
                if isinstance(data, dict) and 'messages' in data:
                    log.success("Formatter output parsed successfully.", "FORMATTER")
                    return data
            except json.JSONDecodeError:
                continue
        
        # If no valid JSON found with regex, try parsing the whole cleaned text
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                log.success("Formatter output parsed successfully.", "FORMATTER")
                return data
        except json.JSONDecodeError as exc:
            log.warn(f"Formatter returned invalid JSON: {exc}", "FORMATTER")
            log.debug(f"Cleaned formatter output: {cleaned[:200]}...", "FORMATTER")
    return None

def _parse_variation_candidates(raw_text: str) -> List[str]:
    candidates: List[str] = []
    if not raw_text:
        return candidates

    # Try JSON first
    try:
        data = json.loads(raw_text)
        if isinstance(data, list):
            candidates.extend(str(item).strip() for item in data if str(item).strip())
        elif isinstance(data, dict):
            maybe_list = data.get("variations") or data.get("keywords")
            if isinstance(maybe_list, list):
                candidates.extend(str(item).strip() for item in maybe_list if str(item).strip())
    except json.JSONDecodeError:
        pass

    if not candidates:
        for line in raw_text.splitlines():
            trimmed = line.strip().strip('-•').strip()
            if not trimmed:
                continue
            # Remove numbering like "1. keyword" or "01) keyword"
            trimmed = re.sub(r"^\s*\d+[\).:-]?\s*", "", trimmed)
            if trimmed:
                candidates.append(trimmed)

    normalized = []
    seen = set()
    for item in candidates:
        clean = item.strip()
        if not clean:
            continue
        lower = clean.lower()
        if lower not in seen:
            seen.add(lower)
            normalized.append(clean)
    return normalized

@app.post("/api/variations/generate", response_model=VariationGenerationResponse)
async def generate_variations(request: VariationGenerationRequest):
    handler = ProviderHandler(request.provider_config)
    log.info(
        f"Variation synthesis request via {request.provider_config.provider}::{request.provider_config.model}",
        "VARIATIONS"
    )

    existing_lower = {v.strip().lower() for v in request.existing_variations if v.strip()}
    guidance = request.variations_prompt.strip() if request.variations_prompt else None

    system_prompt = (
        "You are a tactical variation architect generating concise scenario keywords for an AI data pipeline. "
        "Return only fresh, creative variation prompts that the model can inject into dialogues."
    )

    context_lines = [
        f"Primary Objective: {request.objective.strip()}" if request.objective else None,
        f"System Instructions Summary: {request.system_prompt.strip()[:1000]}" if request.system_prompt else None,
        f"Existing Variations (avoid duplicates): {', '.join(request.existing_variations[:50])}" if request.existing_variations else None,
        f"Additional Guidance: {guidance}" if guidance else None,
    ]
    context = "\n".join(filter(None, context_lines))

    user_prompt = (
        f"Generate {request.count} unique, vivid VARIATION_KEYWORDS that align with the mission.\n"
        "Rules:\n"
        "- Output only the keywords, no numbering or explanations.\n"
        "- Each keyword must be 2-8 words describing a scenario hook or emotional beat.\n"
        "- Respect the existing list; do NOT repeat anything from it.\n"
        "- If guidance is provided, weave it into the themes.\n"
        "- Respond with either a JSON array of strings or newline-separated strings.\n"
        f"\nMission Context:\n{context}\n"
    )

    response, _usage = await handler.generate(system_prompt, user_prompt)
    if not response:
        log.error("Variation provider returned empty response", "VARIATIONS")
        raise HTTPException(status_code=502, detail="Provider returned empty response")

    parsed = _parse_variation_candidates(response)
    filtered = []
    seen = set(existing_lower)
    for item in parsed:
        lower = item.lower()
        if lower in seen:
            continue
        seen.add(lower)
        filtered.append(item)
        if len(filtered) >= request.count:
            break

    if not filtered:
        log.warn("No usable variation keywords extracted", "VARIATIONS")
        raise HTTPException(status_code=422, detail="Unable to extract variation keywords from provider response")

    log.success(f"Generated {len(filtered)} variation keywords", "VARIATIONS")
    return VariationGenerationResponse(variations=filtered)

@app.get("/api/ollama/tags")
async def get_ollama_tags(base_url: str = "http://localhost:11434"):
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(f"{base_url}/api/tags", timeout=10) as resp:
                if resp.status == 200:
                    return await resp.json()
                return {"models": [], "error": f"HTTP {resp.status}"}
    except Exception as e:
        return {"models": [], "error": str(e)}

@app.post("/api/generate")
async def generate_synthetic_data(request: GenerationRequest):
    try:
        log.banner()
        
        active_providers = [p for p in request.provider_configs if p.enabled]
        if not active_providers:
            raise HTTPException(status_code=400, detail="No active providers configured.")

        # Calculate total_tasks based on distribution strategy
        if request.distribution_strategy == "sequential":
            total_tasks = request.batch_size * len(active_providers)
        else:
            # round-robin or hybrid
            total_tasks = request.batch_size
        
        provider_labels = ", ".join(f"{p.provider}::{p.model.split('/')[-1]}" for p in active_providers)
        deployment_info = {
            "TOTAL_ITEMS": total_tasks,
            "ACTIVE_PROVIDERS": f"{len(active_providers)}x  [{provider_labels}]",
            "DISTRIBUTION": request.distribution_strategy.upper(),
            "STREAMING": "ENABLED" if request.stream else "DISABLED",
            "FORMATTER": "ACTIVE" if request.formatter_config and request.formatter_config.enabled else "INACTIVE",
            "TIMESTAMP": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        log.report("DEPLOYMENT PARAMETERS", deployment_info, style="blue")
        
        handlers = [ProviderHandler(p) for p in active_providers]
        variation_list = request.variations or []
        var_threshold = request.variation_similarity_threshold or SEMANTIC_KEYWORD_THRESHOLD
        similarity_threshold = request.similarity_threshold if request.similarity_threshold is not None else SIMILARITY_THRESHOLD
        
        embedding_model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                log.info("Calibrating semantic engine (SentenceTransformer)...", "CORE")
                embedding_model = get_embedding_model()
                log.success("Semantic engine online.", "CORE")
            except Exception as e:
                log.warn(f"Semantic engine offline: {str(e)}")
        
        assistant_embeddings = []
        recent_assistant_buffers: Dict[str, deque] = {}
        if RECENT_DUPLICATE_WINDOW > 0 and SENTENCE_TRANSFORMERS_AVAILABLE:
            for handler in handlers:
                recent_assistant_buffers[handler.config.id] = deque(maxlen=RECENT_DUPLICATE_WINDOW)
        prompt_refs = {}
        if embedding_model:
            log.info("Generating prompt hash references...", "SYNC")
            ref_data = {"objective": request.objective}
            if request.scenario:
                ref_data["scenario"] = request.scenario
                ref_data["full"] = f"{request.scenario}\n{request.objective}"
            else:
                ref_data["full"] = request.objective
                
            for name, text in ref_data.items():
                if text:
                    prompt_refs[name] = np.asarray(embedding_model.encode([text])[0], dtype=np.float32)
            log.success("Hash references synchronized.", "SYNC")

        log.info(f"Launching {total_tasks} tasks across {len(active_providers)} providers [{request.distribution_strategy.upper()}]...", "SYSTEM")
        import time as _time
        _start_time = _time.monotonic()

        async def generate_single(i, forced_handler: Optional[ProviderHandler] = None):
                # Pick handler using round-robin if forced_handler is not provided
                if forced_handler:
                    handler = forced_handler
                    # provider_index is not strictly index anymore when forced, but we can fake it or find it
                    provider_index = handlers.index(handler) if handler in handlers else (i % len(handlers))
                else:
                    handler = handlers[i % len(handlers)]
                    provider_index = i % len(handlers)
                    
                item_num_for_provider = (i // len(handlers)) + 1
                
                # Distribution Strategy Logic
                keyword = None
                if variation_list:
                    if request.distribution_strategy == "sequential":
                        # Each model goes through variations from start to finish
                        # Model 1 -> V1, V2, V3...
                        # Model 2 -> V1, V2, V3...
                        variation_index = (item_num_for_provider - 1) % len(variation_list)
                    elif request.distribution_strategy == "hybrid":
                        # Start at a different offset for each model, then sequential
                        offset = provider_index * (len(variation_list) // len(handlers))
                        variation_index = (item_num_for_provider - 1 + offset) % len(variation_list)
                    else:
                        # default: "round-robin" (cyclic)
                        # Variations are distributed across the total global task index
                        # Task 1 (M1) -> V1, Task 2 (M2) -> V2, Task 3 (M3) -> V3...
                        variation_index = i % len(variation_list)
                        
                    keyword = variation_list[variation_index]
                
                max_attempts = 3
                last_err = "Initial state"
                duplicate_retry_boost = 0
                
                model_short = handler.model.split('/')[-1]
                kw_display = f"kw={keyword[:25]}..." if keyword and len(keyword) > 25 else (f"kw={keyword}" if keyword else "no-kw")
                log.info(f"#{i+1:>3} → {model_short}  [{kw_display}]", "DISPATCH")
                
                for attempt in range(1, max_attempts + 1):
                    try:
                        sys_p, scn_p = inject_dynamic_variations(request.system_prompt, request.scenario or "", i, attempt)
                        
                        # Build natural user prompt without task-oriented language
                        usr_p = request.objective
                        if request.scenario:
                            usr_p = f"{scn_p}\n\n{usr_p}"
                        if keyword:
                            usr_p += f"\n\nContext keyword: {keyword}"
                        
                        if attempt > 1:
                            log.warn(f"#{i+1:>3} retry {attempt}/{max_attempts} → {model_short}", "RETRY")
                        sampling_overrides = adjust_sampling_for_duplicate(handler.config, duplicate_retry_boost)
                        if sampling_overrides:
                            log.debug(
                                f"#{i+1:>3} RETRY_SAMPLING  Δtemp={sampling_overrides.get('temperature')} Δfreq={sampling_overrides.get('frequency_penalty')}",
                                "RETRY"
                            )
                        
                        # Debug: compact single-line debug info on attempt 1
                        if attempt == 1:
                            sys_hash = hash(sys_p)
                            log.debug(f"#{i+1:>3} DBG  sys={len(sys_p)}ch  hash={sys_hash}  usr={usr_p[:80].strip()!r}", "DEBUG")
                        
                        response, usage = await handler.generate(sys_p, usr_p, sampling_overrides or None)
                        if not response:
                            last_err = "Null response from provider"
                            log.warn(f"#{i+1:>3} FAIL  attempt {attempt}: {last_err}", "TASK")
                            continue
                        
                        data = await normalize_model_response(response, scn_p or request.objective, request.formatter_config)
                        if not data:
                            last_err = "Processing error (Invalid JSON structure)"
                            raw_preview = response[:120].replace('\n', ' ') if response else ''
                            log.warn(f"#{i+1:>3} FAIL  attempt {attempt}: {last_err}  raw={raw_preview!r}", "TASK")
                            continue

                        # Validate JSON structure
                        is_valid, validation_error = validate_json_structure(data, i, attempt)
                        if not is_valid:
                            last_err = f"Validation error: {validation_error}"
                            log.warn(f"#{i+1:>3} FAIL  attempt {attempt}: {last_err}", "TASK")
                            continue

                        # Robust sanitization with NERV logs
                        is_valid = True
                        if "messages" in data and isinstance(data["messages"], list):
                            for msg in data["messages"]:
                                if msg.get("role") == "user":
                                    original = msg.get("content", "")
                                    sanitized, removed, used_fallback = strip_prompt_prefix_lines(original)
                                    if removed:
                                        msg["content"] = sanitized
                                        log.warn(f"#{i+1:>3} SANITIZE  prefix leakage stripped.", "TASK")
                                    
                                    if not sanitized:
                                        is_valid = False
                                        break
                                    
                                    leak, name, sim = detect_semantic_prompt_leak(sanitized, embedding_model, prompt_refs)
                                    if leak:
                                        log.error(f"#{i+1:>3} LEAK  prompt leak vs {name} (sim={sim:.3f}).", "TASK")
                                        is_valid = False
                                        break
                        else:
                            is_valid = False

                        if not is_valid:
                            last_err = "Data integrity check failed (Leakage detected)"
                            continue
                        
                        # Keyword & Similarity
                        ast_txt = next((m["content"] for m in data["messages"] if m["role"] == "assistant"), "")
                        
                        if ENABLE_SIMILARITY_CHECK and embedding_model and ast_txt:
                            curr_vec = np.asarray(embedding_model.encode([ast_txt])[0], dtype=np.float32)
                            is_dup = False
                            sim = -1.0
                            for prev_vec in assistant_embeddings:
                                denom = (np.linalg.norm(curr_vec) * np.linalg.norm(prev_vec) + 1e-8)
                                sim = float(np.dot(curr_vec, prev_vec) / denom)
                                if sim >= similarity_threshold:
                                    is_dup = True; break
                            if is_dup:
                                log.warn(f"#{i+1:>3} DUP::GLOBAL sim={sim:.3f} → rerouting...", "TASK")
                                duplicate_retry_boost += 1
                                last_err = f"Redundancy detected ({sim:.3f})"
                                continue

                            buffer = recent_assistant_buffers.get(handler.config.id)
                            recent_dup = False
                            recent_sim = None
                            if buffer is not None:
                                recent_dup, recent_sim = recent_duplicate_check(curr_vec, buffer, similarity_threshold)
                            if recent_dup:
                                log.warn(f"#{i+1:>3} DUP::RECENT sim={recent_sim:.3f} → mild resample", "TASK")
                                duplicate_retry_boost += 1
                                last_err = f"Recent redundancy ({recent_sim:.3f})"
                                continue

                            assistant_embeddings.append(curr_vec)
                            update_recent_buffer(buffer, curr_vec)
                        
                        log.success(f"#{i+1:>3} OK    {model_short}  [{kw_display}]", "DONE")
                        return json.dumps(data, ensure_ascii=False) + '\n', None, handler.model
                    except Exception as e:
                        last_err = str(e)
                        log.error(f"#{i+1:>3} ERR   attempt {attempt}: {last_err}", "TASK")
                
                log.error(f"#{i+1:>3} ABORT after {max_attempts} attempts.", "TASK")
                return None, last_err, handler.model

        # Use the output filename directly as the path (no "outputs/" prefix)
        output_filepath = request.output_filename
        with open(output_filepath, 'w', encoding='utf-8') as f:
            pass # Just clear/create the file
            
        # File lock to prevent workers from corrupting the file with simultaneous writes
        file_lock = asyncio.Lock()
        
        # Shared state for tracking progress across workers
        shared_state = {
            "generated": 0,
            "errors": [],
            "provider_stats": {}
        }

        # Queue implementation for asynchronous worker pool
        queue = asyncio.Queue()
        for i in range(total_tasks):
            queue.put_nowait(i)

        async def worker(handler_index: int, handler: ProviderHandler):
            """Worker function that continuously pulls tasks from the queue and saves incrementally."""
            while not queue.empty():
                try:
                    # Get next task index from queue
                    i = queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                
                res, err, pmodel = None, None, handler.model
                # Execute generation using THIS specific handler
                try:
                    res, err, pmodel = await generate_single(i, forced_handler=handler)
                except Exception as e:
                    log.error(f"Worker {handler.provider}::{handler.model} failed on task #{i+1}: {e}", "WORKER")
                    err = str(e)
                finally:
                    queue.task_done()
                    
                # Incrementally save the result to the file using a lock
                async with file_lock:
                    if res:
                        with open(output_filepath, 'a', encoding='utf-8') as f:
                            f.write(res)
                            f.flush()
                            os.fsync(f.fileno())
                        shared_state["generated"] += 1
                        shared_state["provider_stats"][pmodel] = shared_state["provider_stats"].get(pmodel, 0) + 1
                    else:
                        shared_state["errors"].append(err)
                    
                    completed = shared_state["generated"] + len(shared_state["errors"])
                    if completed % 10 == 0 or completed == total_tasks:
                        log.info(f"Progress: {completed}/{total_tasks} completed ({shared_state['generated']} OK)", "SYSTEM")

        if request.stream:
            # Note: Streaming with parallel workers requires complex queueing of results.
            # We'll implement a simpler async execution but gather results.
            # To maintain pure streaming, we could use an output queue, but for now
            # we will just warn that stream mode might be slightly different in ordering.
            async def data_generator():
                log.info(f"Stream open. Dispatching {total_tasks} tasks across {len(active_providers)} workers...", "SYSTEM")
                _ok = 0
                _pstats: Dict[str, int] = {}
                
                # We need a shared output queue to stream results as they finish
                output_queue = asyncio.Queue()
                
                # Use the output filename directly (no "outputs/" prefix)
                with open(output_filepath, 'w', encoding='utf-8') as f:
                    pass # Just clear/create the file
                file_lock = asyncio.Lock()
                
                async def stream_worker(handler_index: int, handler: ProviderHandler):
                    while not queue.empty():
                        try:
                            i = queue.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                        try:
                            res, err, pmodel = await generate_single(i, forced_handler=handler)
                            
                            # Incrementally save the result to the file during streaming
                            async with file_lock:
                                if res:
                                    with open(output_filepath, 'a', encoding='utf-8') as f:
                                        f.write(res)
                                        f.flush()
                                        os.fsync(f.fileno())
                                        
                            await output_queue.put((res, err, pmodel))
                        except Exception as e:
                            log.error(f"Stream worker {handler.provider} failed on task #{i+1}: {e}", "WORKER")
                            await output_queue.put((None, str(e), handler.model))
                        finally:
                            queue.task_done()
                
                # Start workers
                workers = [
                    asyncio.create_task(stream_worker(idx, h)) 
                    for idx, h in enumerate(handlers)
                ]
                
                # Collect results as they arrive in the output queue
                processed = 0
                while processed < total_tasks:
                    res, err, pmodel = await output_queue.get()
                    if res:
                        _ok += 1
                        _pstats[pmodel] = _pstats.get(pmodel, 0) + 1
                        yield res
                    processed += 1
                
                # Wait for all workers to finish cleanly
                await asyncio.gather(*workers)
                
                _elapsed = _time.monotonic() - _start_time
                log.mission_complete(
                    total=total_tasks,
                    ok=_ok,
                    failed=total_tasks - _ok,
                    provider_stats=_pstats,
                    elapsed_sec=_elapsed,
                    output_path=request.output_filename,
                    distribution="asynchronous worker pool",
                )
            
            return StreamingResponse(data_generator(), media_type="application/x-ndjson")

        # Batch mode: Asynchronous worker pool execution
        log.info(f"Batch mode. Dispatching {total_tasks} tasks asynchronously across {len(active_providers)} workers...", "SYSTEM")
        
        # Start all workers concurrently
        worker_tasks = [
            asyncio.create_task(worker(idx, h)) 
            for idx, h in enumerate(handlers)
        ]
        
        # Wait for all workers to finish their queues
        await asyncio.gather(*worker_tasks)
        
        # We don't need to gather results locally since they're written incrementally
        generated = shared_state["generated"]
        errors = shared_state["errors"]
        provider_stats = shared_state["provider_stats"]
        
        elapsed = _time.monotonic() - _start_time
        log.mission_complete(
            total=total_tasks, ok=generated, failed=len(errors),
            provider_stats=provider_stats, elapsed_sec=elapsed,
            output_path=output_filepath,
            distribution="asynchronous worker pool",
        )
        
        return GenerationResponse(
            status="success", 
            message=f"Generated {generated}", 
            generated_count=generated, 
            errors=errors
        )

    except Exception as e:
        log.error(f"Critical system failure: {str(e)}", "HALT")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    log.banner()
    startup_info = {
        "SERVICE": "SYNTHETIC_DATA_ENGINE",
        "PROTOCOL": "GITShell v4.0.1",
        "HOST": "0.0.0.0",
        "PORT": 8000,
        "SECURITY": "AUTHORIZED_ONLY",
        "STATUS": "INITIALIZING..."
    }
    log.report("SYSTEM BOOT SEQUENCE", startup_info, style="magenta")
    uvicorn.run(app, host="0.0.0.0", port=8000)
