# Premium Loading Screen - Quick Reference

## Component Structure

```
PremiumLoadingScreen
├── Fixed Overlay (backdrop-blur)
├── Main Container (glassmorphism card)
│   ├── Animated Gradient Orbs (background)
│   ├── Pulsing Icon (center)
│   ├── Title & Message
│   ├── Progress Bar (with shimmer)
│   └── Stage Indicators (3 cards)
└── Footer Text
```

## Props API

```typescript
<PremiumLoadingScreen
  stage="ai"                    // "sources" | "ai" | "optimization" | "complete"
  progress={65}                 // 0-100
  customMessage="Your message"  // Optional override
/>
```

## Visual States

### Stage 1: Sources (0-33%)
```
┌────────────────────────────────────────┐
│          [Pulsing Icon]                │
│                                        │
│        Analyse IA en cours             │
│   Connexion aux sources de données     │
│                                        │
│   ▓▓▓▓▓░░░░░░░░░░░░░░░░  33%         │
│                                        │
│   [■] Sources  [ ] AI  [ ] Optimize   │
└────────────────────────────────────────┘
```

### Stage 2: AI Analysis (33-75%)
```
┌────────────────────────────────────────┐
│          [Pulsing Icon]                │
│                                        │
│        Analyse IA en cours             │
│    Analyse IA des profils LinkedIn     │
│                                        │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  65%          │
│                                        │
│   [✓] Sources  [■] AI  [ ] Optimize   │
└────────────────────────────────────────┘
```

### Stage 3: Optimization (75-100%)
```
┌────────────────────────────────────────┐
│          [Pulsing Icon]                │
│                                        │
│        Analyse IA en cours             │
│ Optimisation et validation des résultats│
│                                        │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  95%          │
│                                        │
│   [✓] Sources  [✓] AI  [■] Optimize   │
└────────────────────────────────────────┘
```

## Color Coding

| Element | Color | Purpose |
|---------|-------|---------|
| Active Stage | Blue (#3b82f6) | Current processing |
| Completed Stage | Green (#10b981) | Finished steps |
| Pending Stage | Grey (#71717a) | Upcoming steps |
| Progress Bar | Blue→Purple→Pink gradient | Visual interest |
| Background Orbs | Gradient with 10% opacity | Subtle depth |

## Animation Timings

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| Stage transition | 500ms | ease-out | Smooth state change |
| Progress bar | 700ms | ease-out | Fluid progress |
| Icon pulse | 2s | ease | Breathing effect |
| Shimmer effect | 2s | linear | Active processing feel |
| Ping rings | 1s | cubic-bezier | Attention grabber |

## Integration Examples

### Basic (Auto-managed)
```typescript
import PremiumLoadingScreen from '@/components/ui/PremiumLoadingScreen'

function MyComponent() {
  const [loading, setLoading] = useState(false)

  return loading ? <PremiumLoadingScreen /> : <YourContent />
}
```

### With Hook
```typescript
import { useSearchLoading } from '@/hooks/useSearchLoading'

function SearchPage() {
  const { isLoading, stage, progress, startLoading, stopLoading } = useSearchLoading()

  const handleSearch = async () => {
    startLoading()
    await performSearch()
    stopLoading()
  }

  return (
    <>
      {isLoading && (
        <PremiumLoadingScreen stage={stage} progress={progress} />
      )}
      <SearchForm onSubmit={handleSearch} />
    </>
  )
}
```

### Manual Control
```typescript
function Dashboard() {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<'sources' | 'ai' | 'optimization'>('sources')

  useEffect(() => {
    // Your custom progress logic
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 33) setStage('sources')
        else if (prev < 75) setStage('ai')
        else setStage('optimization')
        return Math.min(prev + 1, 100)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return <PremiumLoadingScreen stage={stage} progress={progress} />
}
```

## Customization Points

### Override Messages
```typescript
const customMessages = {
  sources: "Accessing Apollo.io database...",
  ai: "Deep-learning LinkedIn profiles...",
  optimization: "Applying quality filters..."
}

<PremiumLoadingScreen
  stage={stage}
  customMessage={customMessages[stage]}
/>
```

### Adjust Stage Durations
```typescript
// In useSearchLoading.ts
const loadingStages = [
  { id: "sources", duration: 3000 },   // Slower for emphasis
  { id: "ai", duration: 5000 },        // Longest stage
  { id: "optimization", duration: 1000 } // Quick finish
]
```

### Theme Variants
```typescript
// Create themed versions
<PremiumLoadingScreen className="dark" />          // Dark mode
<PremiumLoadingScreen className="high-contrast" /> // Accessibility
<PremiumLoadingScreen className="minimal" />       // Reduced motion
```

## Performance Checklist

- [ ] Component only mounts when `loading === true`
- [ ] Unmounts immediately on completion
- [ ] Uses CSS animations (not JS loops)
- [ ] GPU-accelerated transforms
- [ ] No memory leaks in intervals
- [ ] Responsive on all screen sizes
- [ ] Accessible to screen readers

## Debugging

### Check Progress Updates
```typescript
useEffect(() => {
  console.log('Loading state:', { stage, progress })
}, [stage, progress])
```

### Verify Stage Transitions
```typescript
const stageThresholds = {
  sources: 0,
  ai: 33,
  optimization: 75,
  complete: 100
}
console.log('Current threshold:', stageThresholds[stage])
```

### Monitor Performance
```typescript
// In browser console
performance.mark('loading-start')
// ... loading complete
performance.mark('loading-end')
performance.measure('loading-duration', 'loading-start', 'loading-end')
```

## Accessibility

### Screen Reader Announcements
The component uses `aria-live` implicitly through state text updates:
- "Analyse IA en cours"
- "Connexion aux sources de données"
- Progress percentage updates

### Keyboard Navigation
- Component is non-interactive (no focus traps)
- Backdrop prevents interaction with background
- ESC key handling can be added if needed

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse,
  .animate-ping,
  .animate-shimmer {
    animation: none;
  }
}
```

## Mobile Considerations

### Touch Targets
- All interactive elements ≥44×44px
- Adequate spacing between elements
- No hover-only states

### Performance
- Lightweight on mobile GPUs
- No jank on 60fps devices
- Fallback for older browsers

### Viewport
- Responsive padding adjusts
- Text scales appropriately
- Grid adapts to portrait/landscape

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| Mobile Safari | 14+ | Full support |
| Chrome Android | 90+ | Full support |

**Fallbacks**:
- Backdrop blur: Falls back to solid background
- Gradients: Falls back to solid colors
- Animations: Gracefully degrades with `prefers-reduced-motion`

---

**Quick Start**: Import → Add to render → Pass props → Enjoy premium UX ✨
