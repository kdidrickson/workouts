import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";

import Select from 'react-select';
// @ts-ignore
import Modal from 'react-modal';
import {Exercise, WorkoutSet} from './types';


interface CreateProps {
  user: firebase.User;
}

interface CreateState {
  name?: string;
  exercises: Exercise[];
  workoutSets: WorkoutSet[];
  isModalOpen: boolean;
}

export class Create extends React.Component<CreateProps, CreateState> {
  nameInputRef?: HTMLInputElement;
  exerciseNameInputRef?: HTMLInputElement;
  exerciseYoutubeUrlInputRef?: HTMLInputElement;
  exerciseNotesInputRef?: HTMLInputElement;
  setTargetRepsRefs: HTMLInputElement[] = [];
  setRestIntervalRefs: HTMLInputElement[] = [];
  setNotesRefs: HTMLInputElement[] = [];

  constructor(props: CreateProps) {
    super(props);
    this.state = {
      name: undefined,
      exercises: [],
      workoutSets: [],
      isModalOpen: false,
    }
  }

  componentDidMount() {
    firebase.database().ref(`exercises/${this.props.user.uid}`).on('value', (snapshot) => {
      const exercisesList = snapshot.val();
      const exercises = Object.keys(exercisesList).map(id => ({id, ...exercisesList[id]}));
      this.setState({exercises});
    });
  }

  renderWorkoutSetInputs(workoutSet: WorkoutSet, index: number) {
    const updateWorkoutSet = (prop: string, value: any) => {
      let workoutSets = [...this.state.workoutSets];
      if(prop in workoutSets[index]) {
        workoutSets[index][prop as keyof WorkoutSet] = value;
        this.setState({workoutSets});
      }
    };

    const resetExerciseInputs = () => {
      this.exerciseNameInputRef && (this.exerciseNameInputRef.value = '');
    };
    const existingExerciseOptions = this.state.exercises.map(({id, name}) => ({
      value: id,
      label: name,
    }));
    const exerciseOptions = [
      {
        value: 'new',
        label: 'Add new exercise',
      },
      ...existingExerciseOptions,
    ];

    let selectedValue = null;
    if(workoutSet.exerciseId) {
      const selectedExercise = this.state.exercises.find(exercise => exercise.id === workoutSet.exerciseId);
      if(selectedExercise) {
        selectedValue = {value: workoutSet.exerciseId, label: selectedExercise.name};
      }
    }

    return (
      <div className="create__workout-set" key={index}>
        <Select
          options={exerciseOptions}
          isSearchable={true}
          value={selectedValue}
          // @ts-ignore
          onChange={({value}) => {
            if(value === 'new') {
              this.setState({isModalOpen: true});
            } else {
              updateWorkoutSet('exerciseId', value);
            }
          }}
        />
        <label>
          Target Reps
        </label>
        <input
          type="number"
          ref={setTargetRepsRef => this.setTargetRepsRefs[index] = setTargetRepsRef as HTMLInputElement}
          onChange={() => {
            updateWorkoutSet('targetReps', this.setTargetRepsRefs[index].value)
          }}
        />
        <label>
          Rest interval (sec)
        </label>
        <input
          type="number"
          ref={setRestIntervalRef => this.setRestIntervalRefs[index] = setRestIntervalRef as HTMLInputElement}
          onChange={() => {
            updateWorkoutSet('restInterval', this.setRestIntervalRefs[index].value)
          }}
        />
        <input
          type="text"
          ref={setNotesRef => this.setNotesRefs[index] = setNotesRef as HTMLInputElement}
          onChange={() => {
            updateWorkoutSet('notes', this.setNotesRefs[index].value)
          }}
        />
        <button
          onClick={() => {
            let workoutSets = [...this.state.workoutSets];
            workoutSets.splice(index, 1);
            this.setState({workoutSets});
          }}
        >
          Remove
        </button>
        <Modal
          isOpen={this.state.isModalOpen}
          onRequestClose={() => {
            this.setState({isModalOpen: false});
            resetExerciseInputs();
          }}
          className="create__new-exercise-modal"
        >
          <h2>Add new exercise</h2>
          <input
            type="text"
            ref={exerciseNameInputRef => this.exerciseNameInputRef = exerciseNameInputRef as HTMLInputElement}
            placeholder="Name"
          />
          <input
            type="text"
            ref={exerciseYoutubeUrlInputRef => this.exerciseYoutubeUrlInputRef = exerciseYoutubeUrlInputRef as HTMLInputElement}
            placeholder="Youtube URL"
          />
          <input
            type="text"
            ref={exerciseNotesInputRef => this.exerciseNotesInputRef = exerciseNotesInputRef as HTMLInputElement}
            placeholder="Notes"
          />
          <button
            onClick={() => {
              this.setState({isModalOpen: false});
              if(this.exerciseNameInputRef && this.exerciseYoutubeUrlInputRef && this.exerciseNotesInputRef) {
                const exerciseRef = firebase.database().ref(`exercises/${this.props.user.uid}`).push();
                exerciseRef.set({
                  name: this.exerciseNameInputRef.value,
                  youtubeUrl: this.exerciseYoutubeUrlInputRef.value,
                  notes: this.exerciseNotesInputRef.value,
                }).then(() => {
                  updateWorkoutSet('exerciseId', exerciseRef.key);
                });
              }
              resetExerciseInputs();
            }}
          >
            Submit
          </button>
        </Modal>
      </div>
    );
  }

  renderWorkoutSetsInputs() {
    const {workoutSets} = this.state;

    return (
      <div className="create__workout-sets">
        {workoutSets.map((workoutSet, index) => this.renderWorkoutSetInputs(workoutSet, index))}
        <button
          className="create__new-workout-set-button"
          onClick={() => {
            this.setState({
              workoutSets: [...workoutSets, {}]
            });
          }}
        >
          Add set
        </button>
      </div>
    );
  }

  render() {
    return (
      <div className="create">
        <h1>Create new workout</h1>
        <input
          className="create__name"
          type="text"
          ref={(nameInputRef) => this.nameInputRef = nameInputRef as HTMLInputElement}
          onChange={() => this.setState({name: this.nameInputRef ? this.nameInputRef.value : undefined})}
        />
        {this.state.name ? this.renderWorkoutSetsInputs() : null}
        <button
          className="create__submit-button"
          onClick={async () => {
            const workoutRef = firebase.database().ref(`workouts/${this.props.user.uid}`).push();
            await workoutRef.set({name: this.state.name});
            const workoutSetPromises = this.state.workoutSets.map(async (workoutSet) => {
              const workoutSetRef = firebase.database().ref(
                `workouts/${this.props.user.uid}/${workoutRef.key}/workoutSets`
              ).push();
              await workoutSetRef.set(workoutSet);
            });
            await Promise.all(workoutSetPromises);
            window.location.pathname = '/';
          }}
        >
          Submit
        </button>
      </div>
    );
  }
}
