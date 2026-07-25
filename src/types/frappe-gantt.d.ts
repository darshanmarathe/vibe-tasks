declare module 'frappe-gantt' {
  export interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress?: number
    dependencies?: string
    custom_class?: string
    [key: string]: any
  }

  export interface GanttOptions {
    view_mode?: string
    date_format?: string
    bar_height?: number
    bar_corner_radius?: number
    padding?: number
    view_mode_select?: boolean
    readonly?: boolean
    readonly_dates?: boolean
    readonly_progress?: boolean
    popup?: (ctx: any) => void
    popup_on?: string
    on_click?: (task: GanttTask) => void
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void
    on_progress_change?: (task: GanttTask, progress: number) => void
    on_view_change?: (mode: string) => void
    custom_popup_html?: (task: GanttTask) => string
    today_button?: boolean
    scroll_to?: string
    container_height?: string | number
    infinite_padding?: boolean
    lines?: string
    move_dependencies?: boolean
    show_expected_progress?: boolean
    hover_on_date?: boolean
  }

  export default class Gantt {
    constructor(wrapper: string | HTMLElement, tasks: GanttTask[], options?: GanttOptions)
    change_view_mode(mode: string): void
    update_task(task_id: string, task: Partial<GanttTask>): void
    add_task(task: GanttTask): void
    remove_task(task_id: string): void
    get_task(task_id: string): GanttTask | undefined
    $svg: SVGElement
    options: GanttOptions
  }
}
