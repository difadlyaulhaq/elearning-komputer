"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Lesson, Section } from "@/types";

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
  sections: Section[];
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  completedLessons: string[];
  isCompleted: boolean;
}

export function ClientLessonPlayers({
  courseId,
  courseTitle,
  sections,
  lesson,
  prevLesson,
  nextLesson,
  completedLessons,
  isCompleted,
}: ClientLessonPlayersProps) {
  const [isMobileDevice, setIsMobileDevice] = React.useState(false);

  React.useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
  }, []);

  return (
    <>
      {isMobileDevice ? (
        <LessonPlayerMobile
          courseId={courseId}
          courseTitle={courseTitle}
          sections={sections}
          lesson={lesson}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          completedLessons={completedLessons}
          isCompleted={isCompleted}
        />
      ) : (
        <LessonPlayerDesktop
          courseId={courseId}
          courseTitle={courseTitle}
          sections={sections}
          lesson={lesson}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          completedLessons={completedLessons}
          isCompleted={isCompleted}
        />
      )}
    </>
  );
}
