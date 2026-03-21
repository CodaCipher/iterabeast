import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export function InteractiveNeuralNetwork() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = null
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 40
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create holographic neural network
    const neuralGroup = new THREE.Group()

    // Create neural layers
    const layerCounts = [5, 8, 6, 4]
    const layers = []
    const connections = []

    let prevLayer = null
    for (let layerIndex = 0; layerIndex < layerCounts.length; layerIndex++) {
      const nodeCount = layerCounts[layerIndex]
      const layer = []
      const layerX = (layerIndex - 1.5) * 15

      for (let i = 0; i < nodeCount; i++) {
        const y = (i - nodeCount / 2) * 6
        const z = (Math.random() - 0.5) * 4

        // Create holographic node
        const geometry = new THREE.SphereGeometry(1.5, 16, 16)
        const material = new THREE.MeshPhongMaterial({
          color: layerIndex === 0 ? 0x00ffff : layerIndex === layerCounts.length - 1 ? 0xff6600 : 0x00ff00,
          emissive: layerIndex === 0 ? 0x00ffff : layerIndex === layerCounts.length - 1 ? 0xff6600 : 0x00ff00,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8,
          wireframe: Math.random() > 0.5
        })

        const node = new THREE.Mesh(geometry, material)
        node.position.set(layerX, y, z)
        node.userData = { layerIndex, nodeIndex: i, baseY: y, baseZ: z }
        layer.push(node)
        neuralGroup.add(node)

        // Connect to previous layer
        if (prevLayer) {
          prevLayer.forEach(prevNode => {
            const points = []
            points.push(prevNode.position)
            points.push(node.position)

            const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0x00ffff,
              transparent: true,
              opacity: 0.2
            })

            const line = new THREE.Line(lineGeometry, lineMaterial)
            connections.push(line)
            neuralGroup.add(line)
          })
        }
      }
      layers.push(layer)
      prevLayer = layer
    }

    scene.add(neuralGroup)

    // Add floating data particles
    const particleCount = 50
    const particles = []
    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = []
    const particleColors = []

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 80
      const y = (Math.random() - 0.5) * 60
      const z = (Math.random() - 0.5) * 40

      particlePositions.push(x, y, z)

      const color = new THREE.Color()
      color.setHSL(Math.random() * 0.2 + 0.5, 1, 0.6) // Cyan to green range
      particleColors.push(color.r, color.g, color.b)
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particlePositions), 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(particleColors), 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particleSystem)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.3)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 100)
    pointLight1.position.set(30, 20, 30)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff6600, 1, 100)
    pointLight2.position.set(-30, -20, 30)
    scene.add(pointLight2)

    // Mouse interaction
    const handleMouseMove = (event) => {
      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const handleMouseEnter = () => setIsHovered(true)
    const handleMouseLeave = () => setIsHovered(false)

    containerRef.current.addEventListener('mousemove', handleMouseMove)
    containerRef.current.addEventListener('mouseenter', handleMouseEnter)
    containerRef.current.addEventListener('mouseleave', handleMouseLeave)

    // Animation loop
    let time = 0
    let animationFrameId
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      time += 0.01

      // Rotate neural network slowly
      neuralGroup.rotation.y = Math.sin(time * 0.2) * 0.1
      neuralGroup.rotation.x = Math.cos(time * 0.15) * 0.05

      // Animate nodes with breathing effect
      layers.forEach(layer => {
        layer.forEach(node => {
          const breathe = Math.sin(time * 2 + node.userData.nodeIndex) * 0.2
          node.scale.setScalar(1 + breathe)
          node.material.opacity = 0.6 + breathe * 0.2

          // Mouse interaction
          if (isHovered) {
            const targetX = mouseRef.current.x * 5
            const targetY = mouseRef.current.y * 5
            node.position.x += (targetX - node.position.x) * 0.02
            node.position.y += (targetY - node.position.y) * 0.02
          } else {
            node.position.x += (node.userData.layerIndex * 15 - 22.5 - node.position.x) * 0.02
            node.position.y += (node.userData.baseY - node.position.y) * 0.02
          }
        })
      })

      // Animate connections
      connections.forEach((connection, index) => {
        connection.material.opacity = 0.1 + Math.sin(time * 3 + index * 0.1) * 0.1
      })

      // Rotate particles
      particleSystem.rotation.y += 0.001
      particleSystem.rotation.x += 0.0005

      // Animate particles
      const positions = particleGeometry.attributes.position.array
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.01
        if (positions[i3 + 1] > 30) positions[i3 + 1] = -30
        if (positions[i3 + 1] < -30) positions[i3 + 1] = 30
      }
      particleGeometry.attributes.position.needsUpdate = true

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
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('mouseenter', handleMouseEnter)
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave)
      
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      renderer.dispose()
      
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [isHovered])

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 pointer-events-auto"
      style={{ opacity: 0.7, cursor: 'crosshair' }}
    />
  )
}
