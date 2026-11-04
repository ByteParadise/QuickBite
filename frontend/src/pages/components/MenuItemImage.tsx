import { useState } from 'react'
import { FiImage } from 'react-icons/fi'

interface MenuItemImageProps {
  src: string
}

export default function MenuItemImage({ src }: MenuItemImageProps) {
  const [failedToLoad, setFailedToLoad] = useState(false)

  if (!src || failedToLoad) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100">
        <FiImage className="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      onError={() => setFailedToLoad(true)}
      className="h-16 w-16 shrink-0 rounded-md object-cover"
    />
  )
}
