import React from 'react'

export default function HomeLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="flex justify-center">
      <div className="card w-full max-w-xl shadow-2xl bg-base-100">
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  )
}