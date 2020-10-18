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
  workoutSets: {[key: string]: WorkoutSet};
  lastAccessed?: number;
};

export interface WorkoutLogSet {
  setsCompleted?: number;
  skipped?: boolean;
  subsets?: {[key: string]: WorkoutSubset};
}

export interface WorkoutLog {
  start?: number;
  end?: number;
  workoutSets?: {[key: string]: WorkoutLogSet};
}