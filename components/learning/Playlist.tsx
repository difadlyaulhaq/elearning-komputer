"use client";

import React from "react";
import Link from "next/link";
import { Section } from "@/types";
import { CheckCircle, PlayCircle, Lock } from "lucide-react";

interface PlaylistProps {
  courseId: string;
  sections: Section[];
  currentLessonId: string;
  completedLessons: string[];
  onItemClick?: () => void;
}

export function Playlist({
  courseId,
  sections,
  currentLessonId,
  completedLessons = [],
  onItemClick,
}: PlaylistProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg text-black">Daftar Materi</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sections.map((section, sIndex) => {
          const completedInSection = section.lessons.filter(l => completedLessons.includes(l.id)).length;
          const sectionProgress = (completedInSection / section.lessons.length) * 100;

          return (
            <div key={section.id} className="border-b last:border-0">
              <div className="p-4 bg-gray-50/70">
                <h3 className="font-semibold text-gray-800 text-sm">
                  Bab {sIndex + 1}: {section.title}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-[#0284c7] h-1.5 rounded-full"
                    style={{ width: `${sectionProgress}%` }}
                  ></div>
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {section.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  const isCompleted = completedLessons.includes(lesson.id);
                  const isLocked = false; // Assuming no lock logic for now

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={
                          isLocked
                            ? "#"
                            : `/learning/course/${courseId}/lesson/${lesson.id}`
                        }
                        onClick={onItemClick}
                      >
                        <div
                          className={`p-4 flex items-center transition-colors text-sm ${
                            isActive
                              ? "bg-[#f0f9ff] text-[#0284c7] font-semibold"
                            : isCompleted
                              ? "bg-green-50/40 text-gray-700"
                              : isLocked
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "hover:bg-gray-50 text-black"
                          }`}
                        >
                          <div className="mr-3 shrink-0">
                            {isCompleted ? (
                              <CheckCircle size={20} className="text-green-500 fill-green-50" />
                            ) : isActive ? (
                              <PlayCircle size={20} className="text-[#0284c7]" />
                            ) : isLocked ? (
                              <Lock size={20} />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                          <span className="flex-1">
                            {lesson.title}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  );
}
