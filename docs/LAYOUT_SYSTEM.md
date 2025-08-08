# Layout System

This document describes the common layout system implemented for the StreamBet web application.

## Overview

The layout system provides consistent structure and styling across all pages while reducing code duplication and improving maintainability.

## Layout Components

### 1. MainLayout
**Location**: `src/components/layout/MainLayout.tsx`

**Purpose**: Standard layout for main application pages that need navigation and footer.

**Features**:
- Navigation component
- Footer component (optional)
- Consistent container and spacing
- Flexbox layout for proper content distribution

**Usage**:
```tsx
import { MainLayout } from '@/components/layout';

const MyPage = () => {
  return (
    <MainLayout showFooter={true} onDashboardClick={handleClick}>
      <div>Your page content here</div>
    </MainLayout>
  );
};
```

**Props**:
- `children`: ReactNode - The page content
- `className?: string` - Additional CSS classes for the main content area
- `showFooter?: boolean` - Whether to show the footer (default: true)
- `onDashboardClick?: () => void` - Callback for dashboard click events

### 2. AuthLayout
**Location**: `src/components/layout/AuthLayout.tsx`

**Purpose**: Layout for authentication pages (login, signup, etc.).

**Features**:
- Auth-specific background gradient
- Centered content with max-width
- Logo and title/subtitle
- Copyright footer
- No navigation

**Usage**:
```tsx
import { AuthLayout } from '@/components/layout';

const LoginPage = () => {
  return (
    <AuthLayout title="Log in" subtitle="Welcome back! Please enter your details.">
      <form>Your login form here</form>
    </AuthLayout>
  );
};
```

**Props**:
- `children`: ReactNode - The auth form content
- `title`: string - Page title
- `subtitle?: string` - Optional subtitle

### 3. AdminLayout
**Location**: `src/components/layout/AdminLayout.tsx`

**Purpose**: Layout specifically for admin pages.

**Features**:
- Navigation component
- Admin-specific container structure
- Left padding for sidebar space
- No footer

**Usage**:
```tsx
import { AdminLayout } from '@/components/layout';

const AdminPage = () => {
  return (
    <AdminLayout onDashboardClick={handleClick}>
      <AdminManagement />
    </AdminLayout>
  );
};
```

**Props**:
- `children`: ReactNode - The admin page content
- `className?: string` - Additional CSS classes
- `onDashboardClick?: () => void` - Callback for dashboard click events

### 4. MinimalLayout
**Location**: `src/components/layout/MinimalLayout.tsx`

**Purpose**: Minimal layout for pages that need basic structure without navigation or footer.

**Features**:
- Basic background and min-height
- No navigation or footer
- Customizable className

**Usage**:
```tsx
import { MinimalLayout } from '@/components/layout';

const MinimalPage = () => {
  return (
    <MinimalLayout className="custom-styles">
      <div>Minimal content here</div>
    </MinimalLayout>
  );
};
```

**Props**:
- `children`: ReactNode - The page content
- `className?: string` - Additional CSS classes

## Migration Guide

### Before (Old Pattern)
```tsx
const OldPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container pt-24 pb-8">
        <div>Content</div>
      </main>
      <Footer />
    </div>
  );
};
```

### After (New Pattern)
```tsx
import { MainLayout } from '@/components/layout';

const NewPage = () => {
  return (
    <MainLayout>
      <div>Content</div>
    </MainLayout>
  );
};
```

## Benefits

1. **Consistency**: All pages now have consistent structure and spacing
2. **Maintainability**: Layout changes only need to be made in one place
3. **DRY Principle**: Eliminates repeated layout code
4. **Type Safety**: TypeScript interfaces ensure proper prop usage
5. **Flexibility**: Easy to customize with className props
6. **Better UX**: Consistent navigation and spacing across the app

## Refactored Pages

The following pages have been refactored to use the new layout system:

- `src/pages/Admin.tsx` → AdminLayout
- `src/pages/Index.tsx` → MainLayout
- `src/pages/Stream.tsx` → MainLayout (no footer)
- `src/pages/Login.tsx` → AuthLayout
- `src/pages/SignUp.tsx` → AuthLayout
- `src/pages/Settings.tsx` → MainLayout
- `src/pages/Deposit.tsx` → MainLayout
- `src/pages/Withdraw.tsx` → MainLayout
- `src/pages/Transactions.tsx` → MainLayout

## Future Considerations

1. **Responsive Design**: Layouts are already responsive but can be enhanced
2. **Theme Support**: Layouts can be extended to support different themes
3. **Loading States**: Consider adding loading state support to layouts
4. **Error Boundaries**: Add error boundary support to layouts
5. **SEO**: Ensure layouts support proper SEO meta tags 