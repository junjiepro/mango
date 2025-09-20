import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toBe('text-blue-500')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('should handle conditional classes with false condition', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle null and undefined inputs', () => {
      const result = cn('base-class', null, undefined, 'another-class')
      expect(result).toBe('base-class another-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle objects with boolean conditions', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'loading': true
      })
      expect(result).toBe('active loading')
    })

    it('should handle complex combinations', () => {
      const isLoading = true
      const variant = 'primary'
      const size = 'lg'

      const result = cn(
        'btn',
        {
          'btn-loading': isLoading,
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
        },
        size === 'lg' && 'btn-lg',
        'custom-class'
      )

      expect(result).toBe('btn btn-loading btn-primary btn-lg custom-class')
    })

    it('should resolve tailwind conflicts correctly', () => {
      const result = cn(
        'bg-red-500 text-white p-4',
        'bg-blue-500 p-2'
      )
      expect(result).toBe('text-white bg-blue-500 p-2')
    })

    it('should handle responsive classes', () => {
      const result = cn(
        'text-sm md:text-base lg:text-lg',
        'text-xs sm:text-sm'
      )
      expect(result).toBe('md:text-base lg:text-lg text-xs sm:text-sm')
    })

    it('should handle state variants', () => {
      const result = cn(
        'hover:bg-gray-100 focus:bg-gray-200',
        'hover:bg-blue-100'
      )
      expect(result).toBe('focus:bg-gray-200 hover:bg-blue-100')
    })
  })
})