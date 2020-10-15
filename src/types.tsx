export interface Exercise {
  id?: string;
  name: string;
  youtubeUrl?: string;
  notes?: string;
};

export interface WorkoutSet {
  exerciseId?: string;
  targetReps?: number;
  restInterval?: number;
  notes?: string;
};

export interface WorkoutSubset {
  reps?: number;
  weight?: number;
}

export interface Workout {
  id?: string;
  name?: string;
  workoutSets: WorkoutSet[];
};