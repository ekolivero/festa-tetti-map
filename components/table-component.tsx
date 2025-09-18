'use client'

import { useMemo, useState } from 'react'
import { Group, Rect, Text } from 'react-konva'

interface TableComponentProps {
    x: number
    y: number
    seats: number
    rotation: 0 | 90
    tableId: string
    onSeatSelect?: (tableId: string, seatId: string, selected: boolean) => void
    reservedSeatIds?: string[]
    seatIdToBookingId?: { [seatId: string]: string }
    highlightBookingId?: string | null
    onReservedSeatClick?: (args: { tableId: string; seatId: string; bookingId: string; seatCenter: { x: number; y: number } }) => void
    selectedReservedSeatId?: string | null
    selectedBookingId?: string | null
}

interface SeatState {
    [seatId: string]: boolean
}

export default function TableComponent({ 
    x, 
    y, 
    seats, 
    rotation = 0, 
    tableId,
    onSeatSelect,
    reservedSeatIds,
    seatIdToBookingId,
    highlightBookingId,
    onReservedSeatClick,
    selectedReservedSeatId,
    selectedBookingId
}: TableComponentProps) {
    const [selectedSeats, setSelectedSeats] = useState<SeatState>({})
    const reservedSet = useMemo(() => new Set(reservedSeatIds ?? []), [reservedSeatIds])
    
    const seatsPerRow = Math.ceil(seats / 2)
    
    const tableWidth = rotation === 0 ? seatsPerRow * 40 : 80
    const tableHeight = rotation === 0 ? 80 : seatsPerRow * 40
    
    const seatWidth = rotation === 0 ? tableWidth / seatsPerRow : tableWidth / 2
    const seatHeight = rotation === 0 ? tableHeight / 2 : tableHeight / seatsPerRow

    const handleSeatClick = (seatId: string, seatCenter: { x: number; y: number }) => {
        if (reservedSet.has(seatId)) {
            const bookingId = seatIdToBookingId?.[seatId]
            if (bookingId && onReservedSeatClick) {
                onReservedSeatClick({ tableId, seatId, bookingId, seatCenter })
            }
            return
        }
        const newSelected = !selectedSeats[seatId]
        setSelectedSeats(prev => ({
            ...prev,
            [seatId]: newSelected
        }))
        
        onSeatSelect?.(tableId, seatId, newSelected)
    }

    const renderSeats = () => {
        const seatElements = []
        
        // Calculate starting seat number based on table ID
        // Using the actual seat numbering from the floor plan
        const tableNumber = parseInt(tableId.replace('T', ''))
        
        // Define the starting seat number for each table based on the floor plan
        const getTableStartingSeat = (tableNum: number): number => {
            const seatRanges: Record<number, number> = {
                // Tables T1-T11 (bottom row, 8 seats each)
                1: 1,    // Seats 1-8
                2: 9,    // Seats 9-16
                3: 17,   // Seats 17-24
                4: 25,   // Seats 25-32
                5: 33,   // Seats 33-40
                6: 41,   // Seats 41-48
                7: 49,   // Seats 49-56
                8: 57,   // Seats 57-64
                9: 65,   // Seats 65-72
                10: 73,  // Seats 73-80
                11: 81,  // Seats 81-88
                
                // Tables T12-T22 (top row, 16 seats each)
                12: 89,  // Seats 89-104
                13: 105, // Seats 105-120
                14: 121, // Seats 121-136
                15: 137, // Seats 137-152
                16: 153, // Seats 153-168
                17: 169, // Seats 169-184
                18: 185, // Seats 185-200
                19: 201, // Seats 201-216
                20: 217, // Seats 217-232
                21: 233, // Seats 233-248
                22: 249, // Seats 249-264
                
                // Tables T23-T31 (left column, 12 seats each)
                23: 265, // Seats 265-276
                24: 277, // Seats 277-288
                25: 289, // Seats 289-300
                26: 301, // Seats 301-312
                27: 313, // Seats 313-324
                28: 325, // Seats 325-336
                29: 337, // Seats 337-348
                30: 349, // Seats 349-360
                31: 361, // Seats 361-372
                
                // Table T32 (8 seats)
                32: 373, // Seats 373-380
                
                // Tables T33-T40 (right column, 16 seats each)
                33: 381, // Seats 381-396
                34: 397, // Seats 397-412
                35: 413, // Seats 413-428
                36: 429, // Seats 429-444
                37: 445, // Seats 445-460
                38: 461, // Seats 461-476
                39: 477, // Seats 477-492
                40: 493, // Seats 493-508
            }
            
            return seatRanges[tableNum] || (tableNum - 1) * 12 + 1
        }
        
        const baseNumber = getTableStartingSeat(tableNumber) - 1
        
        for (let i = 1; i <= seats; i++) {
            const rowIndex = i <= seatsPerRow ? 0 : 1
            const colIndex = i <= seatsPerRow ? i - 1 : i - seatsPerRow - 1
            const seatNumber = baseNumber + i
            const seatId = seatNumber.toString()
            
            let seatX, seatY
            
            if (rotation === 0) {
                seatX = colIndex * seatWidth
                seatY = rowIndex * seatHeight
            } else {
                seatX = rowIndex * seatWidth
                seatY = colIndex * seatHeight
            }
            
            const isReserved = reservedSet.has(seatId)
            const bookingId = seatIdToBookingId?.[seatId]
            const isSelected = selectedSeats[seatId] || false
            const isHighlighted = Boolean(highlightBookingId && bookingId && bookingId === highlightBookingId)
            const isSelectedForDeletion = selectedReservedSeatId === seatId
            const isInSelectedBooking = Boolean(selectedBookingId && bookingId && bookingId === selectedBookingId)
            
            seatElements.push(
                <Group key={seatId}>
                    <Rect
                        x={seatX}
                        y={seatY}
                        width={seatWidth}
                        height={seatHeight}
                        fill={isReserved ? (isInSelectedBooking ? '#dc2626' : isHighlighted ? '#7c3aed' : '#ef4444') : isSelected ? '#3b82f6' : '#f3f4f6'}
                        stroke="#d1d5db"
                        strokeWidth={0.5}
                        onClick={() => handleSeatClick(seatId, { x: x + seatX + seatWidth / 2, y: y + seatY + seatHeight / 2 })}
                        onTap={() => handleSeatClick(seatId, { x: x + seatX + seatWidth / 2, y: y + seatY + seatHeight / 2 })}
                        listening={true}
                    />
                    <Text
                        x={seatX + seatWidth / 2}
                        y={seatY + seatHeight / 2}
                        text={seatId}
                        fontSize={8}
                        fontStyle="bold"
                        fill={isReserved ? 'white' : isSelected ? 'white' : '#374151'}
                        align="center"
                        verticalAlign="middle"
                        offsetX={seatId.length * 2.5}
                        offsetY={4}
                        listening={false}
                    />
                </Group>
            )
        }
        
        return seatElements
    }

    return (
        <Group x={x} y={y}>
            <Text
                x={tableWidth / 2}
                y={-15}
                text={tableId}
                fontSize={12}
                fontStyle="bold"
                fill="#ffffff"
                align="center"
                offsetX={tableId.length * 3}
                listening={false}
            />
            
            <Rect
                x={0}
                y={0}
                width={tableWidth}
                height={tableHeight}
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={2}
                cornerRadius={4}
            />
            
            {renderSeats()}
        </Group>
    )
}