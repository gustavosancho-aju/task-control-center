import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const DEFAULT_SETTINGS = {
  theme: 'light',
  language: 'pt-BR',
  defaultView: 'grid',
  accentColor: '#3b82f6',
  density: 'normal',
  dashboardLayout: 'grid',
  notifications: {
    creation: true,
    completion: true,
    error: true,
    assignment: true,
    statusChange: true,
    comment: true,
    sounds: false,
    email: false,
  },
  agents: {
    autoAssign: true,
    defaultPriority: 'MEDIUM',
  },
  system: {
    autoProcessorInterval: 30,
    maxRetries: 3,
    executionTimeout: 300,
    retentionDays: 90,
  },
}

/**
 * GET /api/settings — Retorna configurações do usuário
 */
export async function GET() {
  try {
    let prefs = await prisma.userPreferences.findUnique({
      where: { userId: 'default' },
    })

    if (!prefs) {
      prefs = await prisma.userPreferences.create({
        data: {
          userId: 'default',
          theme: DEFAULT_SETTINGS.theme,
          language: DEFAULT_SETTINGS.language,
          defaultView: DEFAULT_SETTINGS.defaultView,
          notifications: DEFAULT_SETTINGS.notifications,
          dashboardLayout: {
            layout: DEFAULT_SETTINGS.dashboardLayout,
            accentColor: DEFAULT_SETTINGS.accentColor,
            density: DEFAULT_SETTINGS.density,
          },
        },
      })
    }

    const dashboardConfig = (prefs.dashboardLayout as Record<string, unknown>) || {}

    const settings = {
      theme: prefs.theme,
      language: prefs.language,
      defaultView: prefs.defaultView,
      accentColor: (dashboardConfig.accentColor as string) || DEFAULT_SETTINGS.accentColor,
      density: (dashboardConfig.density as string) || DEFAULT_SETTINGS.density,
      dashboardLayout: (dashboardConfig.layout as string) || DEFAULT_SETTINGS.dashboardLayout,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(prefs.notifications as Record<string, unknown> || {}),
      },
      system: {
        ...DEFAULT_SETTINGS.system,
        ...(dashboardConfig.system as Record<string, unknown> || {}),
      },
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/settings — Atualiza configurações do usuário
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { theme, language, defaultView, accentColor, density, dashboardLayout, notifications, system } = body

    let prefs = await prisma.userPreferences.findUnique({
      where: { userId: 'default' },
    })

    const currentDashboardConfig = (prefs?.dashboardLayout as Record<string, unknown>) || {}
    const currentNotifications = (prefs?.notifications as Record<string, unknown>) || {}

    const updatedDashboardConfig = {
      ...currentDashboardConfig,
      ...(accentColor !== undefined && { accentColor }),
      ...(density !== undefined && { density }),
      ...(dashboardLayout !== undefined && { layout: dashboardLayout }),
      ...(system !== undefined && { system: { ...(currentDashboardConfig.system as Record<string, unknown> || {}), ...system } }),
    }

    const updatedNotifications = notifications
      ? { ...currentNotifications, ...notifications }
      : currentNotifications

    const data = {
      ...(theme !== undefined && { theme }),
      ...(language !== undefined && { language }),
      ...(defaultView !== undefined && { defaultView }),
      notifications: updatedNotifications,
      dashboardLayout: updatedDashboardConfig,
    }

    if (prefs) {
      prefs = await prisma.userPreferences.update({
        where: { userId: 'default' },
        data,
      })
    } else {
      prefs = await prisma.userPreferences.create({
        data: {
          userId: 'default',
          theme: theme || DEFAULT_SETTINGS.theme,
          language: language || DEFAULT_SETTINGS.language,
          defaultView: defaultView || DEFAULT_SETTINGS.defaultView,
          notifications: updatedNotifications,
          dashboardLayout: updatedDashboardConfig,
        },
      })
    }

    const finalDashboardConfig = (prefs.dashboardLayout as Record<string, unknown>) || {}

    const settings = {
      theme: prefs.theme,
      language: prefs.language,
      defaultView: prefs.defaultView,
      accentColor: (finalDashboardConfig.accentColor as string) || DEFAULT_SETTINGS.accentColor,
      density: (finalDashboardConfig.density as string) || DEFAULT_SETTINGS.density,
      dashboardLayout: (finalDashboardConfig.layout as string) || DEFAULT_SETTINGS.dashboardLayout,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(prefs.notifications as Record<string, unknown> || {}),
      },
      system: {
        ...DEFAULT_SETTINGS.system,
        ...(finalDashboardConfig.system as Record<string, unknown> || {}),
      },
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('PATCH /api/settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar configurações' },
      { status: 500 }
    )
  }
}
