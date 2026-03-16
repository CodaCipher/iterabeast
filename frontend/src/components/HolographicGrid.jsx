import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function HolographicGrid({ theme = 'magi' }) {
  const containerRef = useRef(null)
  const materialsRef = useRef({
    core: null,
    innerCore: null,
    particles: null,
    rings: null
  })

  // Theme colors configuration
  const themeColors = {
    'magi': {
      core: 0xff0033,      // NERV Red
      innerCore: 0xff6600, // Orange
      particles: 0x00ffcc, // Cyan
      rings: 0x00ffcc      // Cyan
    },
    'eva-01': {
      core: 0x6b21a8,      // Purple (Armor)
      innerCore: 0x4ade80, // Neon Green (Eyes/Lights)
      particles: 0xa855f7, // Light Purple
      rings: 0x22c55e      // Green
    }
  }

  // Handle Theme Changes
  useEffect(() => {
    const colors = themeColors[theme] || themeColors['magi']
    
    if (materialsRef.current.core) materialsRef.current.core.color.setHex(colors.core)
    if (materialsRef.current.innerCore) materialsRef.current.innerCore.color.setHex(colors.innerCore)
    if (materialsRef.current.particles) materialsRef.current.particles.color.setHex(colors.particles)
    if (materialsRef.current.rings) materialsRef.current.rings.color.setHex(colors.rings)
  }, [theme])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    // Deep fog for infinite depth feeling
    scene.fog = new THREE.FogExp2(0x000000, 0.02)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 35)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // Initial colors based on current theme
    const initialColors = themeColors[theme] || themeColors['magi']

    // === THE BRAIN CORE (Complex Torus Knot) ===
    // Represents the LLM/AI Neural Density
    const coreGeo = new THREE.TorusKnotGeometry(6, 1.5, 150, 20, 2, 3)
    const coreMat = new THREE.MeshBasicMaterial({
      color: initialColors.core,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
    materialsRef.current.core = coreMat
    const core = new THREE.Mesh(coreGeo, coreMat)
    group.add(core)

    // Inner glowing core
    const innerCoreGeo = new THREE.IcosahedronGeometry(3, 1)
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: initialColors.innerCore,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
    materialsRef.current.innerCore = innerCoreMat
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat)
    group.add(innerCore)

    // === NEURAL CLOUD (Particles) ===
    const particlesGeo = new THREE.BufferGeometry()
    const particleCount = 400
    const posArray = new Float32Array(particleCount * 3)
    
    for(let i = 0; i < particleCount * 3; i++) {
      // Spread particles in a sphere shape around the core
      posArray[i] = (Math.random() - 0.5) * 45
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    const particlesMat = new THREE.PointsMaterial({
      size: 0.15,
      color: initialColors.particles,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    materialsRef.current.particles = particlesMat
    const particleMesh = new THREE.Points(particlesGeo, particlesMat)
    group.add(particleMesh)

    // === DATA RINGS (Processing Layers) ===
    const ringGeo = new THREE.RingGeometry(18, 18.2, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: initialColors.rings,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    materialsRef.current.rings = ringMat
    
    const ring1 = new THREE.Mesh(ringGeo, ringMat)
    ring1.rotation.x = Math.PI / 2
    group.add(ring1)

    const ring2 = new THREE.Mesh(ringGeo, ringMat)
    ring2.rotation.x = Math.PI / 3
    ring2.rotation.y = Math.PI / 4
    ring2.scale.set(0.8, 0.8, 0.8)
    group.add(ring2)

    // === INTERACTIVE MOUSE TRACKING ===
    const mouse = { x: 0, y: 0 }
    
    const handleMouseMove = (event) => {
      const rect = containerRef.current.getBoundingClientRect()
      // Normalize mouse -1 to 1
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
    
    window.addEventListener('mousemove', handleMouseMove)

    // === ANIMATION LOOP ===
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.005

      // Core Mutation (Rotation)
      core.rotation.x += 0.002
      core.rotation.y += 0.003
      
      innerCore.rotation.x -= 0.005
      innerCore.rotation.y -= 0.005
      innerCore.scale.setScalar(1 + Math.sin(time * 3) * 0.1) // Pulsing

      // Particle Cloud Rotation
      particleMesh.rotation.y = -time * 0.2
      particleMesh.rotation.z = time * 0.1

      // Rings Rotation
      ring1.rotation.z += 0.002
      ring1.rotation.x = Math.PI / 2 + Math.sin(time) * 0.1
      
      ring2.rotation.z -= 0.003
      
      // Group Parallax (Mouse Interaction)
      const targetRotX = mouse.y * 0.1
      const targetRotY = mouse.x * 0.1
      
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05
      group.rotation.y += (targetRotY - group.rotation.y) * 0.05

      renderer.render(scene, camera)
    }

    animate()

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        background: 'radial-gradient(circle at center, rgba(10,10,10,0.8) 0%, rgba(0,0,0,1) 100%)'
      }}
    />
  )
}
