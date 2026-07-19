import Swal from 'sweetalert2'

/**
 * ตรวจสอบว่าปัจจุบันเป็น dark mode หรือไม่
 */
export const isDarkTheme = (): boolean =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('dark')

/**
 * ค่า SweetAlert background/color ตาม theme ปัจจุบัน
 */
export const getSwalTheme = () => ({
  background: isDarkTheme() ? '#1e293b' : '#ffffff',
  color: isDarkTheme() ? '#f1f5f9' : '#1e293b',
})

/**
 * Tailwind-styled class สำหรับปุ่ม SweetAlert
 */
export const swalTailwindConfig = {
  customClass: {
    confirmButton:
      'bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs mx-1.5 focus:outline-none transition-all',
    cancelButton:
      'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-xl text-xs mx-1.5 focus:outline-none transition-all',
    title: 'text-base font-bold',
    htmlContainer: 'text-xs text-slate-500',
  },
  buttonsStyling: false,
}

/**
 * SweetAlert สำเร็จแบบ auto-close
 */
export const showSuccess = (title: string, text?: string) =>
  Swal.fire({
    title,
    text,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
    ...getSwalTheme(),
  })

/**
 * SweetAlert แสดงข้อผิดพลาด
 */
export const showError = (title: string, text: string) =>
  Swal.fire({
    ...swalTailwindConfig,
    title,
    text,
    icon: 'error',
    ...getSwalTheme(),
  })

/**
 * SweetAlert ยืนยันการลบ
 */
export const showDeleteConfirm = (title: string, text: string) =>
  Swal.fire({
    ...swalTailwindConfig,
    title,
    text,
    icon: 'warning',
    width: '22rem',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    ...getSwalTheme(),
  })
