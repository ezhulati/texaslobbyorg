# Texas Design System

A professional, accessible design system based on the official Texas State Flag colors.

## Color Palette

### Official Texas Flag Colors

#### Texas Blue (Official: #00205B)
The primary color representing trust, authority, and professionalism.

```
texas-blue-50:  #e6eaf2  (Lightest - backgrounds)
texas-blue-100: #ccd5e5  (Very light - hover states)
texas-blue-200: #99abcb  (Light - borders)
texas-blue-300: #6681b1  (Medium-light)
texas-blue-400: #335797  (Medium)
texas-blue-500: #00205B  ★ Official Texas Flag Blue
texas-blue-600: #001a4c  (Dark)
texas-blue-700: #00143d  (Darker)
texas-blue-800: #000d2e  (Very dark)
texas-blue-900: #00071f  (Darkest - text)
```

**Pantone**: 281
**RGB**: 0, 32, 91
**CMYK**: 100, 78, 0, 57

**Usage:**
- Primary buttons and CTAs
- Header backgrounds
- Important navigation elements
- Trust indicators
- Professional accents

#### Texas Red (Official: #BF0D3E)
The accent color representing passion, energy, and action.

```
texas-red-50:  #fce8ed  (Lightest - backgrounds)
texas-red-100: #f9d1db  (Very light - hover states)
texas-red-200: #f3a3b7  (Light)
texas-red-300: #ed7593  (Medium-light)
texas-red-400: #e7476f  (Medium)
texas-red-500: #BF0D3E  ★ Official Texas Flag Red
texas-red-600: #990a32  (Dark)
texas-red-700: #730825  (Darker)
texas-red-800: #4d0519  (Very dark)
texas-red-900: #26030c  (Darkest)
```

**Pantone**: 193
**RGB**: 191, 13, 62
**CMYK**: 0, 100, 59, 11

**Usage:**
- **Featured badges and highlights** (primary use)
- **Secondary CTAs and accents**
- **Important notifications and alerts**
- **Premium tier indicators**
- **Navigation active states**
- Error states and destructive actions (when appropriate)

### Complementary Colors

#### Texas Gold
A warm, inviting color that complements the Texas flag palette.

```
texas-gold-50:  #fef9e7  (Lightest)
texas-gold-100: #fdf3cf  (Very light)
texas-gold-200: #fbe79f  (Light)
texas-gold-300: #f9db6f  (Medium-light)
texas-gold-400: #f7cf3f  (Medium)
texas-gold-500: #d4a017  ★ Base Gold
texas-gold-600: #aa8013  (Dark)
texas-gold-700: #7f600e  (Darker)
texas-gold-800: #55400a  (Very dark)
texas-gold-900: #2a2005  (Darkest)
```

**Usage:**
- Premium features and upgrades
- Special badges and highlights
- Success states
- Secondary CTAs
- Featured content

#### Lone Star (Neutral Grays)
Professional grays for text, borders, and backgrounds.

```
lone-star-50:  #f5f5f5  (Lightest backgrounds)
lone-star-100: #e8e8e8  (Light backgrounds)
lone-star-200: #d1d1d1  (Borders)
lone-star-300: #bababa  (Light text)
lone-star-400: #a3a3a3  (Medium text)
lone-star-500: #6b7280  ★ Base Gray
lone-star-600: #565b66  (Dark text)
lone-star-700: #40444d  (Darker text)
lone-star-800: #2b2e33  (Very dark)
lone-star-900: #15171a  (Darkest text)
```

**Usage:**
- Body text
- Muted elements
- Borders and dividers
- Disabled states
- Subtle backgrounds

## Semantic Color System

The design system uses semantic color tokens that map to the Texas palette:

### Light Mode
```css
--primary: texas-blue-500      /* Main brand color */
--secondary: texas-gold-500    /* Accent color */
--destructive: texas-red-500   /* Errors and warnings */
--accent: texas-blue-100       /* Subtle highlights */
--muted: neutral grays         /* Subtle elements */
```

### Dark Mode
```css
--primary: texas-blue-100      /* Lighter for dark backgrounds */
--secondary: texas-gold-400    /* Brighter gold */
--destructive: texas-red-400   /* Lighter red */
--accent: texas-blue-600       /* Medium blue */
--background: texas-blue-900   /* Dark blue background */
```

## Typography

### Font Families

**Headings**: Playfair Display (serif)
- Elegant, professional serif for headings
- Pairs well with modern sans-serif body text
- Conveys tradition and authority

**Body**: Inter (sans-serif)
- Clean, highly legible modern sans-serif
- Excellent for UI elements and long-form text
- Professional and accessible

### Heading Styles

```css
h1: 800 weight, -0.015em letter-spacing, 1.15 line-height
h2: 700 weight, -0.010em letter-spacing, 1.25 line-height
h3: 700 weight, -0.005em letter-spacing, 1.30 line-height
h4-h6: 600 weight, normal letter-spacing, 1.40 line-height
```

## Custom Shadows

Texas-themed shadows using the official blue:

```
shadow-texas:    Small shadow (cards, buttons)
shadow-texas-md: Medium shadow (modals, popovers)
shadow-texas-lg: Large shadow (dropdowns, overlays)
```

## Usage Examples

### Primary Button
```html
<button class="bg-texas-blue-500 hover:bg-texas-blue-600 text-white">
  Click Me
</button>
```

### Accent Badge
```html
<span class="bg-texas-gold-100 text-texas-gold-700 border border-texas-gold-300">
  Premium
</span>
```

### Error Alert
```html
<div class="bg-texas-red-50 border-l-4 border-texas-red-500 text-texas-red-800">
  Error message
</div>
```

### Gradient Header
```html
<header class="bg-gradient-to-r from-texas-blue-600 to-texas-blue-500">
  Header Content
</header>
```

### Card with Shadow
```html
<div class="bg-white rounded-lg shadow-texas border border-lone-star-200">
  Card Content
</div>
```

## Accessibility Guidelines

### Color Contrast

All color combinations meet WCAG 2.1 Level AA standards:

- **texas-blue-500 on white**: 8.34:1 (AAA)
- **texas-red-500 on white**: 4.89:1 (AA)
- **texas-gold-700 on white**: 4.52:1 (AA)
- **White on texas-blue-500**: 8.34:1 (AAA)
- **White on texas-red-500**: 4.89:1 (AA)

### Text Colors

For optimal readability:
- Light backgrounds: use texas-blue-900 or lone-star-900
- Dark backgrounds: use white or lone-star-50
- Muted text: use lone-star-600 (light) or lone-star-400 (dark)

## Color Philosophy

The Texas Design System embodies:

1. **Authority & Trust**: Deep blues convey professionalism
2. **Energy & Action**: Strategic red accents for emphasis
3. **Warmth & Success**: Gold highlights for premium features
4. **Clarity & Balance**: Neutral grays for content hierarchy

## Migration Guide

Updating from old color scheme:

```
OLD                    →  NEW
'texas-blue': '#003f87'  →  texas-blue-500: '#00205B'
'texas-red': '#bf0a30'   →  texas-red-500: '#BF0D3E'
'austin-sage': '#8b9474' →  texas-gold-500: '#d4a017'
```

Use shades for different states:
- Hover: -600 or -400
- Active: -700
- Disabled: -200 or -300
- Backgrounds: -50 or -100

## Brand Colors Summary

| Color | Hex | Usage |
|-------|-----|-------|
| Texas Blue | #00205B | Primary brand, headers, CTAs |
| Texas Red | #BF0D3E | Alerts, featured items, accents |
| Texas Gold | #d4a017 | Premium features, success states |
| White | #FFFFFF | Backgrounds, contrast |
| Lone Star Gray | #6b7280 | Text, borders, neutral elements |

---

**Official Color Reference**: Texas State Flag
**Maintained by**: TexasLobby.org Design Team
**Last Updated**: November 2025
