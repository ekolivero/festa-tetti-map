'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Stage, Layer, Text } from 'react-konva'
import Link from 'next/link'
import type Konva from 'konva'
import TableComponent from '../../../components/table-component'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'

export default function NightPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params)
    const nightData = useQuery(api.nights.getByShortId, { shortId: id })
    const reservedSeats = useQuery(api.booking.listReservedSeatsByNight, 
        nightData ? { nightId: nightData._id } : 'skip'
    )
    const createBookingMutation = useMutation(api.booking.createBooking)
    const deleteBookingMutation = useMutation(api.booking.deleteBooking)
    const [scale, setScale] = useState(1)
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const stageRef = useRef<Konva.Stage>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    
    const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(null)
    const [lastDist, setLastDist] = useState(0)
    const [selectedSeats, setSelectedSeats] = useState<{[key: string]: string[]}>({})
    const [selectedReservedSeat, setSelectedReservedSeat] = useState<{seatId: string, bookingId: Id<"bookings">, customerName: string} | null>(null)
    const [bookingOpen, setBookingOpen] = useState(false)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const isMobile = useMediaQuery('(max-width: 640px)')

    // Process reserved seats data for table components
    const reservedSeatIds = useMemo(() => {
        return reservedSeats?.map(seat => seat.seatId) || []
    }, [reservedSeats])
    
    const seatIdToBookingId = useMemo(() => {
        return reservedSeats?.reduce((acc, seat) => {
            acc[seat.seatId] = seat.bookingId
            return acc
        }, {} as { [seatId: string]: Id<"bookings"> }) || {}
    }, [reservedSeats])

    const handleReservedSeatClick = useCallback((args: { tableId: string; seatId: string; bookingId: string; seatCenter: { x: number; y: number } }) => {
        const bookingId = args.bookingId as Id<"bookings">
        const reservedSeat = reservedSeats?.find(seat => seat.seatId === args.seatId)
        const customerName = reservedSeat?.bookingCustomerName || 'Sconosciuto'
        setSelectedReservedSeat({ seatId: args.seatId, bookingId, customerName })
    }, [reservedSeats])

    const handleDeleteBooking = useCallback(async () => {
        if (!selectedReservedSeat) return
        
        try {
            await deleteBookingMutation({ bookingId: selectedReservedSeat.bookingId })
            setSelectedReservedSeat(null)
        } catch (error) {
            alert(`Errore nell'eliminazione della prenotazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
        }
    }, [selectedReservedSeat, deleteBookingMutation])

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

    // Helper function to create TableComponent with reserved seats
    const createTable = useCallback((props: { x: number; y: number; seats: number; rotation: 0 | 90; tableId: string }) => (
        <TableComponent
            {...props}
            onSeatSelect={handleSeatSelection}
            reservedSeatIds={reservedSeatIds}
            seatIdToBookingId={seatIdToBookingId}
            onReservedSeatClick={handleReservedSeatClick}
            selectedReservedSeatId={selectedReservedSeat?.seatId || null}
            selectedBookingId={selectedReservedSeat?.bookingId || null}
        />
    ), [handleSeatSelection, reservedSeatIds, seatIdToBookingId, handleReservedSeatClick, selectedReservedSeat])

    const getTotalSelectedSeats = useCallback(() => {
        return Object.values(selectedSeats).flat().length
    }, [selectedSeats])

    const handleOpenBooking = useCallback(() => {
        setBookingOpen(true)
    }, [])

    const handleSubmitBooking = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nightData) return

        try {
            const seats = Object.entries(selectedSeats)
                .filter(([, seatIds]) => seatIds.length > 0)
                .flatMap(([tableId, seatIds]) => 
                    seatIds.map(seatId => ({ seatId, tableId }))
                )

            await createBookingMutation({
                nightId: nightData._id,
                customerName,
                customerPhone,
                seats
            })

            setBookingOpen(false)
            setCustomerName('')
            setCustomerPhone('')
            setSelectedSeats({})
        } catch (error) {
            alert(`Errore nella prenotazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
        }
    }, [customerName, customerPhone, selectedSeats, createBookingMutation, nightData])
    
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Set initial size
        const rect = container.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })

        // Observe container size changes
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const cr = entry.contentRect
                setDimensions({ width: cr.width, height: cr.height })
            }
        })
        ro.observe(container)

        return () => {
            ro.disconnect()
        }
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


    // If night data doesn't exist (but query has completed), show error
    if (nightData === null) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">Serata non trovata</h1>
                    <Link href="/" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors">
                        Torna alla home
                    </Link>
                </div>
            </div>
        )
    }

    // Use fallback data while loading
    const displayNightData = nightData || {
        title: "Caricamento...",
        date: "",
        time: "",
        color: "bg-blue-600",
        hoverColor: "hover:bg-blue-700"
    }

    return (
        <div className="h-dvh flex flex-col bg-gray-900 overflow-hidden">
            <header className={`${displayNightData.color} text-white shadow-lg z-20 flex-shrink-0 h-14 px-3 flex items-center gap-4`}>
                <Link 
                    href="/" 
                    className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-sm transition-colors text-white"
                >
                    ← Indietro
                </Link>
                <h1 className="text-base font-bold">{displayNightData.title}</h1>
            </header>
            
            <div 
                ref={containerRef}
                className="flex-1 overflow-hidden min-h-0"
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
                        {createTable({ x: 50, y: 50, seats: 12, rotation: 0, tableId: "T31" })}
                        
                        {createTable({ x: 50, y: 150, seats: 12, rotation: 0, tableId: "T30" })}
                        {createTable({ x: 50, y: 250, seats: 12, rotation: 0, tableId: "T29" })}
                        {createTable({ x: 50, y: 350, seats: 12, rotation: 0, tableId: "T28" })}
                        {createTable({ x: 50, y: 450, seats: 12, rotation: 0, tableId: "T27" })}
                        {createTable({ x: 50, y: 550, seats: 12, rotation: 0, tableId: "T26" })}
                        {createTable({ x: 50, y: 650, seats: 12, rotation: 0, tableId: "T25" })}
                        {createTable({ x: 50, y: 750, seats: 12, rotation: 0, tableId: "T24" })}
                        {createTable({ x: 50, y: 850, seats: 12, rotation: 0, tableId: "T23" })}

                        {/* Right Column Tables */}
                        {createTable({ x: 350, y: 50, seats: 16, rotation: 0, tableId: "T40" })}
                        {createTable({ x: 350, y: 150, seats: 16, rotation: 0, tableId: "T39" })}
                        {createTable({ x: 350, y: 250, seats: 16, rotation: 0, tableId: "T38" })}
                        {createTable({ x: 350, y: 350, seats: 16, rotation: 0, tableId: "T37" })}
                        {createTable({ x: 350, y: 450, seats: 16, rotation: 0, tableId: "T36" })}
                        {createTable({ x: 350, y: 550, seats: 16, rotation: 0, tableId: "T35" })}
                        {createTable({ x: 350, y: 650, seats: 16, rotation: 0, tableId: "T34" })}
                        {createTable({ x: 350, y: 750, seats: 16, rotation: 0, tableId: "T33" })}
                        {createTable({ x: 510, y: 850, seats: 8, rotation: 0, tableId: "T32" })}

                        {/* Bottom Section Tables T1-T22 */}
                        
                        {/* Top row T12-T22 - All vertical (90°) */}
                        {createTable({ x: 530, y: 1000, seats: 16, rotation: 90, tableId: "T12" })}
                        {createTable({ x: 630, y: 1000, seats: 16, rotation: 90, tableId: "T13" })}
                        {createTable({ x: 730, y: 1000, seats: 16, rotation: 90, tableId: "T14" })}
                        {createTable({ x: 830, y: 1000, seats: 16, rotation: 90, tableId: "T15" })}
                        {createTable({ x: 930, y: 1000, seats: 16, rotation: 90, tableId: "T16" })}
                        {createTable({ x: 1030, y: 1000, seats: 16, rotation: 90, tableId: "T17" })}
                        {createTable({ x: 1130, y: 1000, seats: 16, rotation: 90, tableId: "T18" })}
                        {createTable({ x: 1230, y: 1000, seats: 16, rotation: 90, tableId: "T19" })}
                        {createTable({ x: 1330, y: 1000, seats: 16, rotation: 90, tableId: "T20" })}
                        {createTable({ x: 1430, y: 1000, seats: 16, rotation: 90, tableId: "T21" })}
                        {createTable({ x: 1530, y: 1000, seats: 16, rotation: 90, tableId: "T22" })}

                        {/* Bottom row T1-T11 - All vertical (90°) */}
                        {createTable({ x: 530, y: 1350, seats: 8, rotation: 90, tableId: "T1" })}
                        {createTable({ x: 630, y: 1350, seats: 8, rotation: 90, tableId: "T2" })}
                        {createTable({ x: 730, y: 1350, seats: 8, rotation: 90, tableId: "T3" })}
                        {createTable({ x: 830, y: 1350, seats: 8, rotation: 90, tableId: "T4" })}
                        {createTable({ x: 930, y: 1350, seats: 8, rotation: 90, tableId: "T5" })}
                        {createTable({ x: 1030, y: 1350, seats: 8, rotation: 90, tableId: "T6" })}
                        {createTable({ x: 1130, y: 1350, seats: 8, rotation: 90, tableId: "T7" })}
                        {createTable({ x: 1230, y: 1350, seats: 8, rotation: 90, tableId: "T8" })}
                        {createTable({ x: 1330, y: 1350, seats: 8, rotation: 90, tableId: "T9" })}
                        {createTable({ x: 1430, y: 1350, seats: 8, rotation: 90, tableId: "T10" })}
                        {createTable({ x: 1530, y: 1350, seats: 8, rotation: 90, tableId: "T11" })}


                        <Text
                            x={350}
                            y={-20}
                            text="Padiglione Dronero"
                            fontSize={32}
                            fontStyle="bold"
                            fill="#ffffff"
                            align="center"
                            offsetX={160}
                        />
                        <Text
                            x={1000}
                            y={910}
                            text="Padiglione Centrale"
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

            {/* Floating Prenota Button with Night Color */}
            {getTotalSelectedSeats() > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 text-xs">
                    <button
                        onClick={handleOpenBooking}
                        className={`${displayNightData.color} ${displayNightData.hoverColor} text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-colors`}
                    >
                        Prenota ({getTotalSelectedSeats()} {getTotalSelectedSeats() === 1 ? 'posto' : 'posti'})
                    </button>
                </div>
            )}

            {/* Floating Delete Button */}
            {selectedReservedSeat && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 text-xs flex flex-col items-center gap-2">
                    <div className="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg border">
                        <span className="font-semibold">Prenotazione di: {selectedReservedSeat.customerName}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDeleteBooking}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-colors"
                        >
                            Elimina Prenotazione
                        </button>
                        <button
                            onClick={() => setSelectedReservedSeat(null)}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}

            {/* Booking Form - Dialog on desktop, Drawer on mobile */}
            {!isMobile ? (
                <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Prenotazione</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmitBooking} className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Mario Rossi"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Numero di telefono</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="333 123 4567"
                                    required
                                    className="text-base"
                                />
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Posti selezionati: {getTotalSelectedSeats()}
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setBookingOpen(false)}>Annulla</Button>
                                <Button type="submit">Conferma</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={bookingOpen} onOpenChange={setBookingOpen} shouldScaleBackground={false}>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Prenotazione</DrawerTitle>
                        </DrawerHeader>
                        <form onSubmit={handleSubmitBooking} className="grid gap-4 p-4 pt-0">
                            <div className="space-y-2">
                                <Label htmlFor="name-m">Nome</Label>
                                <Input
                                    id="name-m"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Mario Rossi"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone-m">Numero di telefono</Label>
                                <Input
                                    id="phone-m"
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="333 123 4567"
                                    required
                                    className="text-base"
                                />
                            </div>
                            <div className="px-1 text-sm text-muted-foreground">
                                Posti selezionati: {getTotalSelectedSeats()}
                            </div>
                            <DrawerFooter>
                                <Button type="submit">Conferma</Button>
                                <DrawerClose asChild>
                                    <Button type="button" variant="outline">Annulla</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </form>
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    )
}