'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusInfo, isValidStatus, type TaskStatus } from '@/lib/workflow/state-machine';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, type TaskStatus as ColorTaskStatus } from '@/lib/colors';

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string; // ISO date string
  notes: string | null;
}

interface TimelineProps {
  items: TimelineItem[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets the color for the timeline dot based on status
 */
function getStatusColor(status: string): string {
  if (!isValidStatus(status)) {
    return 'bg-muted-foreground';
  }
  return STATUS_COLORS[status as ColorTaskStatus].dot;
}

/**
 * Gets the ring color for the timeline dot based on status
 */
function getStatusRing(status: string): string {
  if (!isValidStatus(status)) {
    return 'ring-border';
  }
  return STATUS_COLORS[status as ColorTaskStatus].ring;
}

/**
 * Formats a date in Portuguese
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Formats a relative date in Portuguese
 */
function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'agora há pouco';
    if (diffInMinutes < 60) return `há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    if (diffInHours < 24) return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays < 7) return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;

    return format(date, "dd 'de' MMM", { locale: ptBR });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}

/**
 * Renders a status badge
 */
function StatusBadge({ status }: { status: string }) {
  if (!isValidStatus(status)) {
    return (
      <Badge variant="outline" className="font-mono text-xs">
        {status}
      </Badge>
    );
  }

  const info = getStatusInfo(status as TaskStatus);

  return (
    <Badge variant="outline" className={cn('font-medium text-xs', info.color)}>
      <span className="mr-1">{info.icon}</span>
      {info.label}
    </Badge>
  );
}

// ============================================================================
// TIMELINE COMPONENT
// ============================================================================

export function Timeline({ items }: TimelineProps) {
  // Sort items from most recent to oldest
  const sortedItems = [...items].sort((a, b) => {
    return new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime();
  });

  if (sortedItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Nenhuma mudança de status registrada ainda.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0">
      {sortedItems.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === sortedItems.length - 1;

        return (
          <div key={item.id} className="relative">
            {/* Vertical Line */}
            {!isLast && (
              <div
                className="absolute left-[15px] top-8 h-full w-0.5 bg-border"
                aria-hidden="true"
              />
            )}

            {/* Timeline Item */}
            <div className="relative flex gap-4 pb-8 last:pb-0">
              {/* Dot */}
              <div className="relative flex-shrink-0">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full ring-4 ring-background',
                    'flex items-center justify-center',
                    getStatusColor(item.toStatus),
                    getStatusRing(item.toStatus)
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {/* Status Transition */}
                  <div className="flex items-center gap-2">
                    {item.fromStatus && <StatusBadge status={item.fromStatus} />}
                    {item.fromStatus && (
                      <span className="text-muted-foreground text-sm">→</span>
                    )}
                    <StatusBadge status={item.toStatus} />
                  </div>

                  {/* "New" badge for recent items */}
                  {isFirst && (
                    <Badge variant="default" className="text-xs">
                      Atual
                    </Badge>
                  )}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-0.5 mb-2">
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeDate(item.changedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatDate(item.changedAt)}
                  </p>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-3 border border-border/50">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {item.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPACT TIMELINE VARIANT
// ============================================================================

/**
 * Compact timeline for smaller spaces (e.g., cards)
 */
export function TimelineCompact({ items }: TimelineProps) {
  const sortedItems = [...items]
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    .slice(0, 5); // Show only last 5 items

  if (sortedItems.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Sem histórico
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sortedItems.map((item, index) => {
        const isLast = index === sortedItems.length - 1;

        return (
          <div key={item.id} className="relative flex gap-2">
            {/* Mini Dot */}
            <div className="relative flex-shrink-0 pt-1">
              <div
                className={cn(
                  'h-3 w-3 rounded-full ring-2 ring-background',
                  getStatusColor(item.toStatus)
                )}
              />
              {!isLast && (
                <div className="absolute left-[5px] top-4 h-full w-0.5 bg-border" />
              )}
            </div>

            {/* Compact Content */}
            <div className="flex-1 pb-3 last:pb-0">
              <div className="flex items-center gap-2 mb-0.5">
                {item.fromStatus && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {isValidStatus(item.fromStatus)
                        ? getStatusInfo(item.fromStatus as TaskStatus).icon
                        : '•'}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </>
                )}
                <span className="text-xs font-medium">
                  {isValidStatus(item.toStatus)
                    ? getStatusInfo(item.toStatus as TaskStatus).label
                    : item.toStatus}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatRelativeDate(item.changedAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Timeline;
