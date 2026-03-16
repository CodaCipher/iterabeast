import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function NeuralNetwork3D() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 30
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create simple hexagonal grid pattern
    const gridSize = 7
    const spacing = 4
    const particles = []
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const colors = []

    for (let x = -gridSize; x <= gridSize; x++) {
      for (let y = -gridSize; y <= gridSize; y++) {
        const z = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 3
        const posX = x * spacing
        const posY = y * spacing

        particles.push({
          position: new THREE.Vector3(posX, posY, z),
          baseZ: z
        })

        positions.push(posX, posY, z)

        // Color gradient from cyan to orange
        const color = new THREE.Color()
        const t = (x + gridSize) / (gridSize * 2)
        color.setHSL(0.5 + t * 0.2, 1, 0.5) // Cyan to orange
        colors.push(color.r, color.g, color.b)
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))

    // Create points material with vertex colors
    const pointsMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    })

    const points = new THREE.Points(geometry, pointsMaterial)
    scene.add(points)
    particlesRef.current = particles

    // Add simple ambient light
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.3)
    scene.add(ambientLight)

    // Animation loop
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01

      // Update particle positions with simple wave motion
      particles.forEach((particle, index) => {
        const waveX = Math.sin(time + particle.position.x * 0.1) * 0.5
        const waveY = Math.cos(time + particle.position.y * 0.1) * 0.5
        const newZ = particle.baseZ + waveX + waveY

        positions[index * 3] = particle.position.x
        positions[index * 3 + 1] = particle.position.y
        positions[index * 3 + 2] = newZ
      })

      geometry.attributes.position.needsUpdate = true

      // Gentle rotation
      scene.rotation.z = Math.sin(time * 0.1) * 0.05

      renderer.render(scene, camera)
    }

    animate()

    // Handle window resize
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
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  )
}
