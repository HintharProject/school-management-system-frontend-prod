"use client"

import * as React from "react"
import { Moon, Rabbit, Sun, Turtle } from "lucide-react"
import { StandardPageHeader } from "@/components/standard-page-header"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useTheme, type ThemeMode } from "@/components/theme-provider"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { reducedMotion, toggleReducedMotion } = useMotionPreference()

  return (
    <StaggerContainer className="container mx-auto max-w-5xl px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
      <StaggerItem>
        <StandardPageHeader
          title="Settings"
        />
      </StaggerItem>

      <div className="flex flex-col gap-6">
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
              <CardDescription>
                Switch between light and dark surfaces. Same as the header toggle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "light" as ThemeMode, label: "Light", icon: Sun },
                    { id: "dark" as ThemeMode, label: "Dark", icon: Moon },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    variant={theme === id ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    aria-pressed={theme === id}
                    onClick={() => setTheme(id)}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Motion</CardTitle>
              <CardDescription>
                Reduce page and table entrance animations. Same as the header turtle / rabbit control.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant={reducedMotion ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5")}
                aria-pressed={reducedMotion}
                onClick={toggleReducedMotion}
              >
                {reducedMotion ? (
                  <Rabbit className="size-3.5" />
                ) : (
                  <Turtle className="size-3.5" />
                )}
                {reducedMotion ? "Animations reduced" : "Full motion"}
              </Button>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>
    </StaggerContainer>
  )
}
