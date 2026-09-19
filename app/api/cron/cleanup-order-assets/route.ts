import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUCKET_NAME = 'custom-branding-assets'
const RETENTION_DAYS = 14

export async function GET(req: NextRequest) {
  return handleCleanup(req)
}

export async function POST(req: NextRequest) {
  return handleCleanup(req)
}

async function handleCleanup(req: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Cutoff date: 14 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS)
    const cutoffIso = cutoffDate.toISOString()

    // ── Phase 1: Query delivered orders older than 14 days ──
    // First attempt using delivered_at
    let { data: eligibleOrders, error: orderError } = await supabase
      .from('retail_orders')
      .select('id, status, delivered_at, assets_purged, notes, retail_order_items ( id, product_name, customization, selected_color )')
      .eq('status', 'delivered')
      .lte('delivered_at', cutoffIso)
      .or('assets_purged.is.null,assets_purged.eq.false')

    // If delivered_at column is missing (42703), fallback to updated_at
    if (orderError && orderError.code === '42703') {
      const fallback = await supabase
        .from('retail_orders')
        .select('id, status, updated_at, notes, retail_order_items ( id, product_name, selected_color )')
        .eq('status', 'delivered')
        .lte('updated_at', cutoffIso)
      eligibleOrders = fallback.data as any
      orderError = fallback.error
    }

    if (orderError) {
      console.error('[Cleanup Assets] Error querying eligible orders:', orderError)
      return NextResponse.json({ error: 'Failed to query orders for cleanup' }, { status: 500 })
    }

    let totalDeletedFiles = 0
    const processedOrders: string[] = []

    if (eligibleOrders && eligibleOrders.length > 0) {
      for (const order of eligibleOrders) {
        const pathsToDelete: string[] = []

        // 1. Check order items customization
        if (order.retail_order_items && Array.isArray(order.retail_order_items)) {
          for (const item of order.retail_order_items as any[]) {
            const custom = item.customization
            if (custom?.logo_storage_path) {
              pathsToDelete.push(custom.logo_storage_path)
            } else if (custom?.logoUrl && typeof custom.logoUrl === 'string') {
              const match = custom.logoUrl.match(/custom-branding-assets\/(.+)$/)
              if (match) pathsToDelete.push(match[1])
            }
          }
        }

        // 2. Check notes fallback
        if (order.notes) {
          try {
            const parsed = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes
            if (parsed.custom_items) {
              for (const ci of parsed.custom_items) {
                if (ci.customization?.logo_storage_path) {
                  pathsToDelete.push(ci.customization.logo_storage_path)
                }
              }
            }
          } catch {}
        }

        // 3. Delete physical files from Supabase Storage
        if (pathsToDelete.length > 0) {
          const uniquePaths = Array.from(new Set(pathsToDelete))
          const { error: removeError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(uniquePaths)

          if (!removeError) {
            totalDeletedFiles += uniquePaths.length
          } else {
            console.warn(`[Cleanup Assets] Non-fatal storage deletion error for order ${order.id}:`, removeError)
          }
        }

        // 4. Update order state to assets_purged = true
        try {
          await supabase
            .from('retail_orders')
            .update({
              assets_purged: true,
              assets_purged_at: new Date().toISOString()
            })
            .eq('id', order.id)
        } catch {
          // If columns don't exist, update notes
          await supabase
            .from('retail_orders')
            .update({
              notes: JSON.stringify({
                ...(typeof order.notes === 'string' ? JSON.parse(order.notes || '{}') : order.notes || {}),
                assets_purged: true,
                assets_purged_at: new Date().toISOString()
              })
            })
            .eq('id', order.id)
        }

        processedOrders.push(order.id)
      }
    }

    // ── Phase 2: Prune Abandoned Pending Uploads Older than 7 Days ──
    let prunedPendingFiles = 0
    try {
      const { data: pendingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list('pending', { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })

      if (pendingFiles && pendingFiles.length > 0) {
        const pendingCutoff = new Date()
        pendingCutoff.setDate(pendingCutoff.getDate() - 7) // 7 days old

        const stalePending = pendingFiles
          .filter(f => f.created_at && new Date(f.created_at) < pendingCutoff)
          .map(f => `pending/${f.name}`)

        if (stalePending.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(stalePending)
          prunedPendingFiles = stalePending.length
        }
      }
    } catch (pendingErr) {
      console.warn('[Cleanup Assets] Non-fatal error cleaning pending uploads:', pendingErr)
    }

    return NextResponse.json({
      success: true,
      retentionPolicyDays: RETENTION_DAYS,
      ordersProcessedCount: processedOrders.length,
      ordersProcessed: processedOrders,
      orderFilesDeleted: totalDeletedFiles,
      pendingFilesPruned: prunedPendingFiles,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cleanup Assets] Fatal cleanup job error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal asset cleanup failure' },
      { status: 500 }
    )
  }
}
