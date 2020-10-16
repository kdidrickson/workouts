import React from 'react';
import Countdown from 'react-countdown';

import {Exercise, WorkoutSet, WorkoutSubset} from './types';

interface ExerciseLoggingProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  onSubmit: (workoutSubsets: WorkoutSubset[]) => void;
}

interface ExerciseLoggingState {
  subsets: WorkoutSubset[];
}

export class ExerciseLogging extends React.Component<ExerciseLoggingProps, ExerciseLoggingState> {
  subsetRepsInputRefs: HTMLInputElement[] = [];
  subsetWeightInputRefs: HTMLInputElement[] = [];
  nextWorkoutSetDate: number

  constructor(props: ExerciseLoggingProps) {
    super(props);
    this.state = {
      subsets: [{}],
    };
    this.nextWorkoutSetDate = Date.now() + props.workoutSet.restInterval * 1000;
  }

  renderWorkoutSubset(subset: WorkoutSubset, index: number) {
    const updateWorkoutSubset = (prop: string, value: any) => {
      let subsets = [...this.state.subsets];
      // @ts-ignore
      subsets[index][prop as keyof WorkoutSubset] = value;
      this.setState({subsets});
    };

    return (
      <div className="exercise-logging__subset" key={index}>
        <input
          type="number"
          className="exercise-logging__subset__reps"
          ref={(subsetRepsInputRef => this.subsetRepsInputRefs[index] = subsetRepsInputRef)}
          onChange={() => {
            updateWorkoutSubset('reps', this.subsetRepsInputRefs[index].value);
          }}
        />
        <input
          type="number"
          className="exercise-logging__subset__weight"
          ref={(subsetWeightInputRef => this.subsetWeightInputRefs[index] = subsetWeightInputRef)}
          onChange={() => {
            updateWorkoutSubset('weight', this.subsetWeightInputRefs[index].value);
          }}
        />
        {subset.reps && subset.weight && (
          <button
            className="exercise-logging__add-logging-input-button"
            onClick={() => {
              const subsets = [...this.state.subsets, {}];
              this.setState({subsets});
            }}
          >
            Add
          </button>
        )}
        {!!index && (
          <button
            className="exercise-logging__add-logging-input-button"
            onClick={() => {
              const subsets = [...this.state.subsets];
              subsets.splice(index, 1);
              this.setState({subsets});
            }}
          >
            Remove
          </button>
        )}
      </div>
    );
  }
  
  render() {
    const {onSubmit} = this.props;
    const {subsets} = this.state;
    return (
      <div className="exercise-logging">
        <div className="exercise-logging__countdown">
          <Countdown
            date={this.nextWorkoutSetDate}
            overtime={true}
          />
        </div>
        <div className="exercise-logging__subsets">
          {subsets.map((subset, index) => this.renderWorkoutSubset(subset, index))}
        </div>
        {subsets.every(({reps, weight}) => reps && weight) && (
          <button
            className="exercise-logging__submit-button"
            onClick={() => {
              onSubmit(this.state.subsets);
            }}
          >
            Start next set!
          </button>
        )}
      </div>
    );
  }
}