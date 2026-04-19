import Link from 'next/link'

const TENANT = 'goldenpanda'

const SECTIONS = [
  {
    heading: 'Customer-facing',
    views: [
      {
        title: 'Menu / Ordering',
        description: 'Browse and order from the full menu.',
        href: `/?tenant=${TENANT}`,
        bg: '#1a2e1a',
        accent: '#2ECC71',
        icon: '🍜',
      },
      {
        title: 'Checkout',
        description: 'Payment and order summary screen.',
        href: `/checkout?tenant=${TENANT}`,
        bg: '#1a2a3a',
        accent: '#3B82F6',
        icon: '💳',
      },
    ],
  },
  {
    heading: 'Staff',
    views: [
      {
        title: 'Cashier Kiosk',
        description: 'In-store self-order touchscreen.',
        href: `/kiosk?tenant=${TENANT}`,
        bg: '#2e1a1a',
        accent: '#F97316',
        icon: '🖥️',
      },
      {
        title: 'Kitchen Display',
        description: 'Live ticket queue for kitchen staff.',
        href: `/kitchen?tenant=${TENANT}`,
        bg: '#2a1a1a',
        accent: '#E74C3C',
        icon: '👨‍🍳',
      },
      {
        title: 'Restaurant Admin',
        description: 'Menu, orders, hours, deals & settings.',
        href: `/admin?tenant=${TENANT}`,
        bg: '#1a1a2e',
        accent: '#A855F7',
        icon: '🏪',
      },
    ],
  },
  {
    heading: 'Platform',
    views: [
      {
        title: 'Super Admin',
        description: 'Manage all restaurants and plans.',
        href: '/superadmin',
        bg: '#1a1a1a',
        accent: '#D4A017',
        icon: '⚙️',
      },
      {
        title: 'Login',
        description: 'Staff & admin authentication.',
        href: '/login',
        bg: '#141414',
        accent: '#6B7280',
        icon: '🔐',
      },
    ],
  },
]

export default function DemoPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0C0C0C', padding: '56px 32px 80px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #D4A017, #C0392B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#F0EBE3' }}>LocalBite</span>
          </div>
          <p style={{ fontSize: 14, color: '#5a5450', margin: 0 }}>
            Demo navigator &mdash; tenant: <code style={{ color: '#D4A017', background: '#1a1610', padding: '1px 6px', borderRadius: 4 }}>{TENANT}</code>
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <div key={section.heading} style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#3a3530', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              {section.heading}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {section.views.map((view) => (
                <Link
                  key={view.href}
                  href={view.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    background: view.bg,
                    border: `1px solid ${view.accent}22`,
                    borderRadius: 12,
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${view.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {view.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F0EBE3', margin: 0 }}>{view.title}</p>
                    <p style={{ fontSize: 12, color: '#5a5450', margin: '2px 0 0' }}>{view.description}</p>
                  </div>
                  <span style={{ color: '#3a3530', fontSize: 16, flexShrink: 0 }}>›</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 11, color: '#2a2520', textAlign: 'center', marginTop: 8 }}>
          Demo-only page · not linked in the app
        </p>
      </div>
    </main>
  )
}
