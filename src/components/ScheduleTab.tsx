'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  CalendarDays, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  X,
  Zap,
  Calendar
} from 'lucide-react'
import {
  showSuccess,
  showError,
  showDeleteConfirm,
  getSwalTheme
} from '../lib/swalConfig'

interface CalendarEvent {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  google_event_id: string | null
  created_at: string
}

interface ScheduleTabProps {
  userId: string
}

export default function ScheduleTab({ userId }: ScheduleTabProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // Sync simulation state
  const [syncing, setSyncing] = useState(false)
  const [syncLogs, setSyncLogs] = useState<string[]>([])
  const [syncSuccess, setSyncSuccess] = useState(false)

  // Selected date for filter (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    fetchEvents()
  }, [userId])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching calendar events:', message)
    } finally {
      setLoading(false)
    }
  }

  // Format Helper
  const formatTime = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }

  // Handle Event submission with Google Calendar sync simulation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startTime || !endTime) return

    setSyncing(true)
    setSyncSuccess(false)
    setSyncLogs([])

    const logs = [
      'กำลังเรียกใช้งาน Google OAuth Token...',
      'เชื่อมต่อ Google API Endpoints...',
      'กำลังสร้าง Event ใหม่ใน Google Calendar ปฏิทินหลัก...',
      'อัปเดตข้อมูลทิศทางเดียว (One-way Sync) เรียบร้อยแล้ว!'
    ]

    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400))
      setSyncLogs(prev => [...prev, logs[i]])
    }

    setSyncSuccess(true)
    await new Promise(resolve => setTimeout(resolve, 600))

    const mockGcalId = `mock-gcal-${Math.random().toString(36).substring(2, 11)}`

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          title: title.trim(),
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          google_event_id: mockGcalId
        })

      if (error) throw error
      
      setTitle('')
      setStartTime('')
      setEndTime('')
      setIsModalOpen(false)
      fetchEvents()

      showSuccess('บันทึกสำเร็จ', 'เพิ่มกิจกรรมและซิงก์ข้อมูลเรียบร้อย')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      showError('เกิดข้อผิดพลาด', 'บันทึกปฏิทินล้มเหลว: ' + message)
    } finally {
      setSyncing(false)
      setSyncSuccess(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    const result = await showDeleteConfirm(
      'ลบนัดหมาย?',
      'คุณต้องการลบปฏิทินนัดหมายนี้ใช่หรือไม่ (ข้อมูลจำลองใน Google Calendar จะยังคงอยู่)'
    )

    if (!result.isConfirmed) return

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)

      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== id))

      showSuccess('ลบออกแล้ว')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      showError('เกิดข้อผิดพลาด', 'ลบล้มเหลว: ' + message)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    return { firstDay, totalDays }
  }

  const { firstDay, totalDays } = getDaysInMonth(selectedDate)

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
  }

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d))
  }

  const [clickedDate, setClickedDate] = useState<Date>(new Date())
  const selectedDateEvents = events.filter(e => {
    const eventDate = new Date(e.start_time)
    return (
      eventDate.getDate() === clickedDate.getDate() &&
      eventDate.getMonth() === clickedDate.getMonth() &&
      eventDate.getFullYear() === clickedDate.getFullYear()
    )
  })

  const hasEventOnDay = (day: Date) => {
    return events.some(e => {
      const eventDate = new Date(e.start_time)
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      )
    })
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8 text-slate-700 dark:text-slate-200 antialiased">
      {/* ── Tab Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">กำหนดการ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ตารางการนัดหมายและการซิงก์ปฏิทิน</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มนัดหมาย</span>
        </button>
      </div>

      {/* Responsive Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar selector */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-4 shadow-sm">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {selectedDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="rounded-lg p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="rounded-lg p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
            <span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />

              const isSelected =
                day.getDate() === clickedDate.getDate() &&
                day.getMonth() === clickedDate.getMonth() &&
                day.getFullYear() === clickedDate.getFullYear()

              const hasEvents = hasEventOnDay(day)

              return (
                <button
                  key={idx}
                  onClick={() => setClickedDate(day)}
                  className={`relative flex flex-col items-center justify-center h-9 w-9 lg:h-11 lg:w-11 mx-auto rounded-lg text-xs lg:text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {hasEvents && (
                    <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500 dark:bg-indigo-400'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Selected Date Agenda Events */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>นัดหมายประจำวันที่ {clickedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}</span>
          </h3>

          {loading ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : selectedDateEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
              <Calendar className="h-5 w-5 text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">ไม่มีนัดหมายในวันนี้</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{evt.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        <span>{formatTime(evt.start_time)} - {formatTime(evt.end_time)}</span>
                      </p>
                      {evt.google_event_id && (
                        <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                          <RefreshCw className="h-2 w-2" />
                          <span>Synced: {evt.google_event_id.replace('mock-gcal-', '')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors p-1.5 rounded-lg cursor-pointer"
                    title="ลบนัดหมาย"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Event Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 p-4">
          <div className="relative w-full max-w-sm lg:max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            
            {/* Syncing Overlay Loading Screen */}
            {syncing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-white/95 dark:bg-slate-900/95 p-6 text-center">
                {!syncSuccess ? (
                  <>
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">กำลังดำเนินการ</h3>
                    <div className="mt-4 space-y-1 text-left w-full max-w-xs font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl max-h-[140px] overflow-y-auto">
                      {syncLogs.map((log, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <Zap className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">บันทึกสำเร็จ</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">กำลังบันทึกลงระบบฐานข้อมูล...</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Form Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">สร้างนัดหมายใหม่</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">หัวข้อนัดหมาย</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นัดประชุม, ไปหาหมอ..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">เวลาเริ่ม</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">เวลาสิ้นสุด</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                >
                  สร้างนัดหมาย
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}