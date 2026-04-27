import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function SmartBioScanLogo({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 420 200'
      className={cn('h-12 w-auto', className)}
      {...props}
    >
      <circle cx='100' cy='100' r='95' fill='#EFF6FF' stroke='#DBEAFE' strokeWidth='0.5' />
      <circle cx='100' cy='100' r='84' fill='none' stroke='#DBEAFE' strokeWidth='7' />
      <circle
        cx='100'
        cy='100'
        r='84'
        fill='none'
        stroke='#0891B2'
        strokeWidth='7'
        strokeDasharray='110 418'
        strokeLinecap='round'
        strokeDashoffset='0'
      />
      <circle cx='184' cy='100' r='11' fill='#0891B2' />
      <circle cx='184' cy='100' r='20' fill='#0891B2' opacity='0.12' />
      <circle cx='142' cy='173' r='5' fill='#0891B2' opacity='0.5' />
      <line x1='100' y1='16' x2='100' y2='26' stroke='#BFDBFE' strokeWidth='2.5' strokeLinecap='round' />
      <line x1='184' y1='100' x2='174' y2='100' stroke='#BFDBFE' strokeWidth='2.5' strokeLinecap='round' />
      <line x1='100' y1='184' x2='100' y2='174' stroke='#BFDBFE' strokeWidth='2.5' strokeLinecap='round' />
      <line x1='16' y1='100' x2='26' y2='100' stroke='#BFDBFE' strokeWidth='2.5' strokeLinecap='round' />
      <circle cx='100' cy='52' r='14' fill='#0C4A6E' />
      <path
        d='M83 70 Q83 65 100 65 Q117 65 117 70 L121 104 Q121 110 115 110 L112 110 L112 134 Q112 140 100 140 Q88 140 88 134 L88 110 L85 110 Q79 110 79 104 Z'
        fill='#0C4A6E'
      />
      <text x='210' y='90' fontFamily='system-ui, -apple-system, sans-serif' fontSize='52' fontWeight='300' fill='#0C4A6E' letterSpacing='-0.5'>
        Smart
      </text>
      <text x='210' y='148' fontFamily='system-ui, -apple-system, sans-serif' fontSize='52' fontWeight='700' fill='#0891B2' letterSpacing='-0.5'>
        Bio<tspan fill='#0C4A6E'>Scan</tspan>
      </text>
      <text x='212' y='172' fontFamily='system-ui, -apple-system, sans-serif' fontSize='11' fontWeight='400' fill='#94A3B8' letterSpacing='3'>
        ANÁLISIS DE COMPOSICIÓN
      </text>
      <text x='212' y='188' fontFamily='system-ui, -apple-system, sans-serif' fontSize='11' fontWeight='400' fill='#94A3B8' letterSpacing='3'>
        CORPORAL
      </text>
    </svg>
  )
}

export function SmartBioScanIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='5 5 190 190'
      className={cn('size-4', className)}
      {...props}
    >
      <circle cx='100' cy='100' r='95' fill='#EFF6FF' stroke='#DBEAFE' strokeWidth='0.5' />
      <circle cx='100' cy='100' r='84' fill='none' stroke='#DBEAFE' strokeWidth='7' />
      <circle
        cx='100'
        cy='100'
        r='84'
        fill='none'
        stroke='#0891B2'
        strokeWidth='7'
        strokeDasharray='110 418'
        strokeLinecap='round'
        strokeDashoffset='0'
      />
      <circle cx='184' cy='100' r='11' fill='#0891B2' />
      <circle cx='100' cy='52' r='14' fill='#0C4A6E' />
      <path
        d='M83 70 Q83 65 100 65 Q117 65 117 70 L121 104 Q121 110 115 110 L112 110 L112 134 Q112 140 100 140 Q88 140 88 134 L88 110 L85 110 Q79 110 79 104 Z'
        fill='#0C4A6E'
      />
    </svg>
  )
}
