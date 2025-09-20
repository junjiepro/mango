import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

describe('UI Components', () => {
  describe('Button', () => {
    it('should render button with default props', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'button')
    })

    it('should render submit button when type is submit', () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole('button', { name: 'Submit' })
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should handle click events', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(<Button onClick={handleClick}>Click me</Button>)

      const button = screen.getByRole('button', { name: 'Click me' })
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button', { name: 'Disabled' })
      expect(button).toBeDisabled()
    })

    it('should apply variant classes correctly', () => {
      const { rerender } = render(<Button variant="outline">Outline</Button>)

      let button = screen.getByRole('button', { name: 'Outline' })
      expect(button).toHaveClass('border')

      rerender(<Button variant="ghost">Ghost</Button>)
      button = screen.getByRole('button', { name: 'Ghost' })
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('should apply size classes correctly', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)

      let button = screen.getByRole('button', { name: 'Small' })
      expect(button).toHaveClass('h-8')

      rerender(<Button size="default">Default</Button>)
      button = screen.getByRole('button', { name: 'Default' })
      expect(button).toHaveClass('h-9')
    })

    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>)

      const button = screen.getByRole('button', { name: 'Custom' })
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Input', () => {
    it('should render input with default props', () => {
      render(<Input />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('data-slot', 'input')
    })

    it('should render different input types', () => {
      const { rerender } = render(<Input type="email" />)

      let input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')

      rerender(<Input type="password" />)
      input = screen.getByDisplayValue('')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should apply custom className', () => {
      render(<Input className="custom-input" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input')
    })

    it('should handle placeholder text', () => {
      render(<Input placeholder="Enter text here" />)

      const input = screen.getByPlaceholderText('Enter text here')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Label', () => {
    it('should render label with text', () => {
      render(<Label>Test Label</Label>)

      const label = screen.getByText('Test Label')
      expect(label).toBeInTheDocument()
      expect(label.tagName).toBe('LABEL')
    })

    it('should associate with input using htmlFor', () => {
      render(
        <div>
          <Label htmlFor="test-input">Test Label</Label>
          <Input id="test-input" />
        </div>
      )

      const label = screen.getByText('Test Label')
      const input = screen.getByRole('textbox')

      expect(label).toHaveAttribute('for', 'test-input')
      expect(input).toHaveAttribute('id', 'test-input')
    })

    it('should apply custom className', () => {
      render(<Label className="custom-label">Custom Label</Label>)

      const label = screen.getByText('Custom Label')
      expect(label).toHaveClass('custom-label')
    })
  })

  describe('Card Components', () => {
    it('should render card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should handle card click events', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()

      render(
        <Card onClick={handleClick}>
          <CardContent>Clickable card</CardContent>
        </Card>
      )

      const card = screen.getByText('Clickable card').closest('div')
      await user.click(card!)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should apply custom className to card components', () => {
      render(
        <Card className="custom-card">
          <CardHeader className="custom-header">
            <CardTitle className="custom-title">Title</CardTitle>
            <CardDescription className="custom-description">Description</CardDescription>
          </CardHeader>
          <CardContent className="custom-content">Content</CardContent>
        </Card>
      )

      expect(screen.getByText('Title').closest('.custom-card')).toBeInTheDocument()
      expect(screen.getByText('Title').closest('.custom-header')).toBeInTheDocument()
      expect(screen.getByText('Title')).toHaveClass('custom-title')
      expect(screen.getByText('Description')).toHaveClass('custom-description')
      expect(screen.getByText('Content')).toHaveClass('custom-content')
    })
  })

  describe('Alert Components', () => {
    it('should render alert with default variant', () => {
      render(
        <Alert>
          <AlertDescription>Default alert message</AlertDescription>
        </Alert>
      )

      const alert = screen.getByText('Default alert message')
      expect(alert).toBeInTheDocument()
    })

    it('should render destructive alert variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          <AlertDescription>Error message</AlertDescription>
        </Alert>
      )

      const alertContainer = screen.getByTestId('alert')
      expect(alertContainer).toHaveClass('text-destructive')
    })

    it('should apply custom className to alert components', () => {
      render(
        <Alert className="custom-alert" data-testid="custom-alert">
          <AlertDescription className="custom-description">
            Custom alert
          </AlertDescription>
        </Alert>
      )

      const alert = screen.getByTestId('custom-alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveClass('custom-alert')
      expect(screen.getByText('Custom alert')).toHaveClass('custom-description')
    })
  })
})