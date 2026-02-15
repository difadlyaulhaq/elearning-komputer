"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Lesson } from "@/types";

// Dynamically import client components to prevent SSR errors related to client-only contexts.
// This ensures they only render on the client side where AuthProvider is available.
const LessonPlayerMobile = dynamic(
  () => import("./LessonPlayerMobile").then((mod) => mod.LessonPlayerMobile),
  { ssr: false }
);

const LessonPlayerDesktop = dynamic(
  () => import("./LessonPlayerDesktop").then((mod) => mod.LessonPlayerDesktop),
  { ssr: false }
);

interface ClientLessonPlayersProps {
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  completedLessons: string[];
  isCompleted: boolean;
}

export function ClientLessonPlayers({
  courseId,
  courseTitle,
  lesson,
  prevLesson,
  nextLesson,
  completedLessons,
  isCompleted,
}: ClientLessonPlayersProps) {
  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <LessonPlayerMobile
          courseId={courseId}
          courseTitle={courseTitle}
          lesson={lesson}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          completedLessons={completedLessons}
          isCompleted={isCompleted}
        />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <LessonPlayerDesktop
          courseId={courseId}
          courseTitle={courseTitle}
          lesson={lesson}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          completedLessons={completedLessons}
          isCompleted={isCompleted}
        />
      </div>
    </>
  );
}
