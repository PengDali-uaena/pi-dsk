import { useEffect } from 'react'
import { useSession } from '../../store/session'

/** notify 请求的轻提示，6 秒后自行消失。 */
export function Toasts(): React.JSX.Element {
  const toasts = useSession((state) => state.toasts)
  const dismissToast = useSession((state) => state.dismissToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 6000))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [toasts, dismissToast])

  if (toasts.length === 0) return <></>

  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.level}`} onClick={() => dismissToast(toast.id)}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
