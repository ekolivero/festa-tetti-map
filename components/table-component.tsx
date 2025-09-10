'use client'

import { useState } from 'react'
import { Group, Rect, Text } from 'react-konva'

interface TableComponentProps {
    x: number
    y: number
    seats: number
    rotation: 0 | 90
    tableId: string
    onSeatSelect?: (tableId: string, seatId: string, selected: boolean) => void
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
    onSeatSelect 
}: TableComponentProps) {
    const [selectedSeats, setSelectedSeats] = useState<SeatState>({})
    
    const seatsPerRow = Math.ceil(seats / 2)
    
    const tableWidth = rotation === 0 ? seatsPerRow * 40 : 80
    const tableHeight = rotation === 0 ? 80 : seatsPerRow * 40
    
    const seatWidth = rotation === 0 ? tableWidth / seatsPerRow : tableWidth / 2
    const seatHeight = rotation === 0 ? tableHeight / 2 : tableHeight / seatsPerRow

    const handleSeatClick = (seatId: string) => {
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
        const tableNumber = parseInt(tableId.replace('T', ''))
        const baseNumber = (tableNumber - 1) * 12 // Each table gets 12 consecutive numbers
        
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
            
            const isSelected = selectedSeats[seatId] || false
            
            seatElements.push(
                <Group key={seatId}>
                    <Rect
                        x={seatX}
                        y={seatY}
                        width={seatWidth}
                        height={seatHeight}
                        fill={isSelected ? '#3b82f6' : '#f3f4f6'}
                        stroke="#d1d5db"
                        strokeWidth={0.5}
                        onClick={() => handleSeatClick(seatId)}
                        onTap={() => handleSeatClick(seatId)}
                        listening={true}
                    />
                    <Text
                        x={seatX + seatWidth / 2}
                        y={seatY + seatHeight / 2}
                        text={seatId}
                        fontSize={8}
                        fontStyle="bold"
                        fill={isSelected ? 'white' : '#374151'}
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