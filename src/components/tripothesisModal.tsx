import React from 'react'
import { createPortal } from 'react-dom'
import classNames from 'classnames'

/**
 * Dialog shell for the Tripothesis modals. Render it only while open: it opens on mount and calls
 * `onClose` when dismissed. It is portaled to <body> so it never inherits table cell styles.
 */
export default function TripothesisModal({ title, subtitle, onClose, fitContent = false, children }: {
  title: string,
  subtitle?: string | null,
  onClose: () => void,
  /** Shrink to the content's height (up to the usual size) instead of a fixed height. */
  fitContent?: boolean,
  children: React.ReactNode,
}) {
  const ref = React.useRef<HTMLDialogElement>(null)
  const onCloseRef = React.useRef(onClose)
  onCloseRef.current = onClose
  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])
  return createPortal(
    <dialog className="modal" ref={ref}>
      <div className={classNames('modal-box w-11/12 max-w-screen-xl overflow-hidden flex flex-col p-0', fitContent ? 'max-h-[83vh]' : 'h-5/6')}>
        <p className="text-lg text-center text-gray-900 flex-shrink-0 py-2">{title}</p>
        {subtitle ? <p className="text-base text-center text-gray-600 px-4 line-clamp-2 flex-shrink-0" title={subtitle}>{subtitle}</p> : null}
        {children}
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>,
    document.body,
  )
}
