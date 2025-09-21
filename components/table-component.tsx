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

                // Tables T23-T30 (left column, now 16 seats each - preserving original 12)
                23: 265, // Original seats 265-276, new seats 1001-1004
                24: 277, // Original seats 277-288, new seats 1005-1008
                25: 289, // Original seats 289-300, new seats 1009-1012
                26: 301, // Original seats 301-312, new seats 1013-1016
                27: 313, // Original seats 313-324, new seats 1017-1020
                28: 325, // Original seats 325-336, new seats 1021-1024
                29: 337, // Original seats 337-348, new seats 1025-1028
                30: 349, // Original seats 349-360, new seats 1029-1032

                // Table T31 (8 seats only)
                31: 361, // Seats 361-368

                // Table T32 (8 seats)
                32: 373, // Seats 373-380

                // Table T33 (now 8 seats instead of 16)
                33: 381, // Seats 381-388

                // Tables T34-T40 (right column, 16 seats each)
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

        // Special handling for expanded tables T23-T30
        const getSeatIdForPosition = (tableNum: number, position: number): string => {
            // Tables T23-T30 need special handling for backward compatibility (16 seats each)
            if (tableNum >= 23 && tableNum <= 30) {
                if (position <= 12) {
                    // Original seats - keep the same numbering
                    const baseNumber = getTableStartingSeat(tableNum) - 1
                    return (baseNumber + position).toString()
                } else {
                    // New seats (positions 13-16) - use 1000+ range
                    const newSeatOffset = (tableNum - 23) * 4 + (position - 12)
                    return (1000 + newSeatOffset).toString()
                }
            }

            // All other tables use normal sequential numbering
            const baseNumber = getTableStartingSeat(tableNum) - 1
            return (baseNumber + position).toString()
        }

        for (let i = 1; i <= seats; i++) {
            const rowIndex = i <= seatsPerRow ? 0 : 1
            const colIndex = i <= seatsPerRow ? i - 1 : i - seatsPerRow - 1
            const seatId = getSeatIdForPosition(tableNumber, i)
            
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