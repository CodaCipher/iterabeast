import React from 'react'
import { cn } from '../../lib/utils'

const Tabs = ({ defaultValue, children, className, ...props }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  return (
    <div className={cn("w-full", className)} {...props}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  )
}

const TabsList = ({ className, children, activeTab, setActiveTab, ...props }) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full",
      className
    )}
    {...props}
  >
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
)

const TabsTrigger = ({ value, children, activeTab, setActiveTab, className, ...props }) => (
  <button
    onClick={() => setActiveTab(value)}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      activeTab === value
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </button>
)

const TabsContent = ({ value, children, activeTab, className, ...props }) => (
  activeTab === value && (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

export { Tabs, TabsList, TabsTrigger, TabsContent }
