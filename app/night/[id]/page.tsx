'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Text } from 'react-konva'
import type Konva from 'konva'
import TableComponent from '../../../components/table-component'

export default function NightPage({ params }: { params: { id: string } }) {
    const [scale, setScale] = useState(1)
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const stageRef = useRef<Konva.Stage>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    
    const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(null)
    const [lastDist, setLastDist] = useState(0)
    const [selectedSeats, setSelectedSeats] = useState<{[key: string]: string[]}>({})

    const handleSeatSelection = useCallback((tableId: string, seatId: string, selected: boolean) => {
        setSelectedSeats(prev => {
            const tableSeats = prev[tableId] || []
            if (selected) {
                return {
                    ...prev,
                    [tableId]: [...tableSeats, seatId]
                }
            } else {
                return {
                    ...prev,
                    [tableId]: tableSeats.filter(id => id !== seatId)
                }
            }
        })
    }, [])

    const getTotalSelectedSeats = useCallback(() => {
        return Object.values(selectedSeats).flat().length
    }, [selectedSeats])

    const handleBooking = useCallback(() => {
        const totalSeats = getTotalSelectedSeats()
        const bookingDetails = Object.entries(selectedSeats)
            .filter(([, seats]) => seats.length > 0)
            .map(([tableId, seats]) => `${tableId}: ${seats.join(', ')}`)
            .join('\n')
        
        alert(`Prenotazione per ${totalSeats} posti:\n\n${bookingDetails}`)
    }, [selectedSeats, getTotalSelectedSeats])
    
    const HEADER_HEIGHT = 64

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight - HEADER_HEIGHT
            })
        }
        
        updateDimensions()
        window.addEventListener('resize', updateDimensions)
        
        return () => window.removeEventListener('resize', updateDimensions)
    }, [])

    const getDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    }, [])

    const getCenter = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
        }
    }, [])

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault()
        
        const stage = e.target.getStage()
        if (!stage) return
        
        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        if (!pointer) return
        
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        }
        
        const direction = e.evt.deltaY > 0 ? -1 : 1
        const scaleBy = 1.02
        const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
        const finalScale = Math.max(0.1, Math.min(5, newScale))
        
        setScale(finalScale)
        setStagePos({
            x: pointer.x - mousePointTo.x * finalScale,
            y: pointer.y - mousePointTo.y * finalScale,
        })
    }, [])

    const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
        const touches = e.evt.touches
        
        if (touches.length === 2) {
            // Disable dragging for pinch gestures
            const stage = stageRef.current
            if (stage) {
                stage.draggable(false)
            }
            
            const touch1 = touches[0]
            const touch2 = touches[1]
            
            const dist = getDistance(
                { x: touch1.clientX, y: touch1.clientY },
                { x: touch2.clientX, y: touch2.clientY }
            )
            
            const center = getCenter(
                { x: touch1.clientX, y: touch1.clientY },
                { x: touch2.clientX, y: touch2.clientY }
            )
            
            setLastDist(dist)
            setLastCenter(center)
        } else {
            // Enable dragging for single touch
            const stage = stageRef.current
            if (stage) {
                stage.draggable(true)
            }
        }
    }, [getDistance, getCenter])

    const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
        e.evt.preventDefault()
        const touches = e.evt.touches
        
        if (touches.length === 2 && lastCenter && lastDist > 0) {
            const touch1 = touches[0]
            const touch2 = touches[1]
            
            const newDist = getDistance(
                { x: touch1.clientX, y: touch1.clientY },
                { x: touch2.clientX, y: touch2.clientY }
            )
            
            const newCenter = getCenter(
                { x: touch1.clientX, y: touch1.clientY },
                { x: touch2.clientX, y: touch2.clientY }
            )
            
            const stage = stageRef.current
            if (!stage) return
            
            const scaleMultiplier = newDist / lastDist
            const newScale = Math.max(0.1, Math.min(5, scale * scaleMultiplier))
            
            // Convert screen coordinates to stage coordinates
            const containerRect = containerRef.current?.getBoundingClientRect()
            if (!containerRect) return
            
            const stageCenter = {
                x: newCenter.x - containerRect.left,
                y: newCenter.y - containerRect.top
            }
            
            const oldScale = scale
            const mousePointTo = {
                x: (stageCenter.x - stagePos.x) / oldScale,
                y: (stageCenter.y - stagePos.y) / oldScale,
            }
            
            setScale(newScale)
            setStagePos({
                x: stageCenter.x - mousePointTo.x * newScale,
                y: stageCenter.y - mousePointTo.y * newScale,
            })
            
            setLastDist(newDist)
            setLastCenter(newCenter)
        }
    }, [lastCenter, lastDist, scale, stagePos, getDistance, getCenter])

    const handleTouchEnd = useCallback(() => {
        // Re-enable dragging when touches end
        const stage = stageRef.current
        if (stage) {
            stage.draggable(true)
        }
        
        setLastCenter(null)
        setLastDist(0)
    }, [])

    return (
        <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
            <header className="bg-gray-800 text-white p-4 h-16 flex items-center justify-between shadow-lg z-20 flex-shrink-0">
                <h1 className="text-xl font-bold">Night {params.id}</h1>
                <div className="text-sm">
                    Zoom: {Math.round(scale * 100)}%
                </div>
            </header>
            
            <div 
                ref={containerRef}
                className="flex-1 overflow-hidden"
                style={{ 
                    height: `calc(100vh - ${HEADER_HEIGHT}px)`
                }}
            >
                <Stage
                    ref={stageRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    scaleX={scale}
                    scaleY={scale}
                    x={stagePos.x}
                    y={stagePos.y}
                    draggable={true}
                    onDragEnd={(e) => {
                        setStagePos({
                            x: e.target.x(),
                            y: e.target.y(),
                        })
                    }}
                >
                    <Layer>
                        {/* Left Column Tables */}
                        <TableComponent
                            x={50}
                            y={50}
                            seats={12}
                            rotation={0}
                            tableId="T31"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={150}
                            seats={12}
                            rotation={0}
                            tableId="T30"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={250}
                            seats={12}
                            rotation={0}
                            tableId="T29"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={350}
                            seats={12}
                            rotation={0}
                            tableId="T28"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={450}
                            seats={12}
                            rotation={0}
                            tableId="T27"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={550}
                            seats={12}
                            rotation={0}
                            tableId="T26"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={650}
                            seats={12}
                            rotation={0}
                            tableId="T25"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={750}
                            seats={12}
                            rotation={0}
                            tableId="T24"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={50}
                            y={850}
                            seats={12}
                            rotation={0}
                            tableId="T23"
                            onSeatSelect={handleSeatSelection}
                        />

                        {/* Right Column Tables */}
                        <TableComponent
                            x={350}
                            y={50}
                            seats={12}
                            rotation={0}
                            tableId="T40"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={150}
                            seats={12}
                            rotation={0}
                            tableId="T39"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={250}
                            seats={12}
                            rotation={0}
                            tableId="T38"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={350}
                            seats={12}
                            rotation={0}
                            tableId="T37"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={450}
                            seats={12}
                            rotation={0}
                            tableId="T36"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={550}
                            seats={12}
                            rotation={0}
                            tableId="T35"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={650}
                            seats={12}
                            rotation={0}
                            tableId="T34"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={350}
                            y={750}
                            seats={12}
                            rotation={0}
                            tableId="T33"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={430}
                            y={850}
                            seats={8}
                            rotation={0}
                            tableId="T32"
                            onSeatSelect={handleSeatSelection}
                        />

                        {/* Bottom Section Tables T1-T22 */}
                        
                        {/* Top row T12-T22 - All vertical (90°) */}
                        <TableComponent
                            x={430}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T12"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={530}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T13"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={630}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T14"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={730}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T15"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={830}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T16"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={930}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T17"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1030}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T18"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1130}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T19"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1230}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T20"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1330}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T21"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1430}
                            y={1000}
                            seats={16}
                            rotation={90}
                            tableId="T22"
                            onSeatSelect={handleSeatSelection}
                        />

                        {/* Bottom row T1-T11 - All vertical (90°) */}
                        <TableComponent
                            x={430}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T1"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={530}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T2"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={630}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T3"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={730}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T4"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={830}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T5"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={930}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T6"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1030}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T7"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1130}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T8"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1230}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T9"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1330}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T10"
                            onSeatSelect={handleSeatSelection}
                        />
                        
                        <TableComponent
                            x={1430}
                            y={1350}
                            seats={8}
                            rotation={90}
                            tableId="T11"
                            onSeatSelect={handleSeatSelection}
                        />


                        <Text
                            x={350}
                            y={-20}
                            text="Capannone Tetti"
                            fontSize={32}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            offsetX={160}
                        />
                        <Text
                            x={1000}
                            y={910}
                            text="Capannone Dronero"
                            fontSize={32}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            offsetX={160}
                        />
                        <Text
                            x={20}
                            y={1680}
                            text="Ingresso ---"
                            fontSize={44}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            offsetX={160}
                        />
                        <Text
                            x={40}
                            y={2000}
                            text="BAR"
                            fontSize={52}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            rotation={-90}
                            offsetX={160}
                        />
                        <Text
                            x={1400}
                            y={2000}
                            text="ORCHESTRA"
                            fontSize={52}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            rotation={-90}
                            offsetX={160}
                        />
                    </Layer>
                </Stage>
            </div>

            {/* Floating Prenota Button */}
            {getTotalSelectedSeats() > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 text-xs">
                    <button
                        onClick={handleBooking}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                        Prenota ({getTotalSelectedSeats()} {getTotalSelectedSeats() === 1 ? 'posto' : 'posti'})
                    </button>
                </div>
            )}
        </div>
    )
}