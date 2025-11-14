import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useState
} from "react"
import { Check, Loader, X } from "tabler-icons-react"

import rotating from "./autoSaveInput.module.css"

interface Props {
  value: string
  onChange: (value: string) => void
  style?: CSSProperties
  placeholder?: string
  inputType?: string
}

export default function AutoSaveInput({
  value,
  onChange,
  style,
  placeholder,
  inputType
}: Props): ReactElement {
  const [data, setData] = useState(value)
  // -1 = Empty, 0 = loading, 1 = success
  const [isSaved, setIsSaved] = useState(0)

  useEffect(() => {
    setData(value)
    if (value.length > 0) {
      setIsSaved(1)
    } else {
      setIsSaved(-1)
    }
  }, [value])

  useEffect(() => {
    if (data === "") {
      setIsSaved(-1)
      return
    }
    setIsSaved(0)
    const timer = setTimeout(() => {
      onChange(data)
      setIsSaved(1)
    }, 2 * 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [data])
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "5px", alignItems: "center" }}>
      <input
        onChange={(e) => {
          setData(e.target.value)
        }}
        value={data}
        placeholder={placeholder ?? "sk-xxxxx"}
        type={inputType ?? "password"}
        style={style}
      />
      <div style={{ flexShrink: 0 }}>
        {isSaved === -1 ? <X size={20} color="#ff2825" /> : null}
        {isSaved === 1 ? <Check size={20} color="#00d26a" /> : null}
        {isSaved === 0 ? (
          <Loader size={20} className={rotating.rotating} />
        ) : null}
      </div>
    </div>
  )
}
