import './Create.scss';

import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';

import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";

import Select from 'react-select';
import {Exercise, WorkoutSet} from './types';


interface CreateProps {
  user: firebase.User;
}

interface CreateState {
  name?: string;
  exercises: Exercise[];
  workoutSets: WorkoutSet[];
  isModalOpen: boolean | number;
  modalError: string | null;
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
      modalError: null,
    }
  }

  componentDidMount() {
    this.nameInputRef && this.nameInputRef.focus();
    firebase.database().ref(`exercises/${this.props.user.uid}`).on('value', (snapshot) => {
      const exercisesList = snapshot.val();
      let exercises = [];
      if(exercisesList) {
        exercises = Object.keys(exercisesList).map(id => ({id, ...exercisesList[id]}));
      }
      this.setState({exercises});
    });
  }

  renderWorkoutSetInputs(workoutSet: WorkoutSet, index: number) {
    const updateWorkoutSet = (prop: string, value: any) => {
      let workoutSets = [...this.state.workoutSets];
      // @ts-ignore
      workoutSets[index][prop as keyof WorkoutSet] = value;
      this.setState({workoutSets});
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

    const onModalHide = () => {
      this.setState({isModalOpen: false});
      resetExerciseInputs();
    }

    return (
      <div className="create__workout-set" key={index}>
        <Card>
          <Card.Body>
            <Row>
              <Col xs={12}>
                <Form.Group controlId={`exercise-${index}`}>
                  <Form.Label>Exercise</Form.Label>
                  <Select
                    options={exerciseOptions}
                    isSearchable={true}
                    value={selectedValue}
                    // @ts-ignore
                    onChange={({value}) => {
                      if(value === 'new') {
                        this.setState({isModalOpen: index});
                      } else {
                        updateWorkoutSet('exerciseId', value);
                      }
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <Form.Group controlId={`reps-${index}`}>
                  <Form.Label>Target Reps</Form.Label>
                  <Form.Control
                    type="number"
                    ref={setTargetRepsRef => this.setTargetRepsRefs[index] = setTargetRepsRef as HTMLInputElement}
                    onChange={() => {
                      updateWorkoutSet('targetReps', this.setTargetRepsRefs[index].value)
                    }}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group controlId={`rest-${index}`}>
                  <Form.Label>Rest interval (sec)</Form.Label>
                  <Form.Control
                    type="number"
                    ref={setRestIntervalRef => this.setRestIntervalRefs[index] = setRestIntervalRef as HTMLInputElement}
                    onChange={() => {
                      updateWorkoutSet('restInterval', this.setRestIntervalRefs[index].value)
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col>
                <Form.Group controlId={`notes-${index}`}>
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    type="text"
                    ref={setNotesRef => this.setNotesRefs[index] = setNotesRef as HTMLInputElement}
                    onChange={() => {
                      updateWorkoutSet('notes', this.setNotesRefs[index].value)
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
          <Card.Footer>
            <Row>
              <Col xs={12}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    let workoutSets = [...this.state.workoutSets];
                    workoutSets.splice(index, 1);
                    this.setState({workoutSets});
                  }}
                >
                  Remove
                </Button>
                <Button
                  className="ml-3"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    let workoutSets = [...this.state.workoutSets];
                    workoutSets.splice(index + 1, 0, workoutSets[index]);
                    this.setState({workoutSets});
                  }}
                >
                  Copy
                </Button>
              </Col>
            </Row>
          </Card.Footer>
        </Card>
        
        <Modal
          show={this.state.isModalOpen === index}
          onHide={onModalHide}
        >
          <Modal.Header>
            <Modal.Title>Add new exercise</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId={`modal-exerciseName-${index}`}>
                <Form.Label>Exercise Name</Form.Label>
                <Form.Control
                  type="text"
                  ref={exerciseNameInputRef => this.exerciseNameInputRef = exerciseNameInputRef as HTMLInputElement}
                />
              </Form.Group>
              <Form.Group controlId={`modal-youtubeUrl-${index}`}>
                <Form.Label>YouTube URL</Form.Label>
                <Form.Control
                  type="text"
                  ref={exerciseYoutubeUrlInputRef => this.exerciseYoutubeUrlInputRef = exerciseYoutubeUrlInputRef as HTMLInputElement}
                />
              </Form.Group>
              <Form.Group controlId={`modal-notes-${index}`}>
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  type="text"
                  ref={exerciseNotesInputRef => this.exerciseNotesInputRef = exerciseNotesInputRef as HTMLInputElement}
                />
              </Form.Group>
              {this.state.modalError && (
                <Alert variant="danger">
                  {this.state.modalError}
                </Alert>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={onModalHide}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if(this.exerciseNameInputRef && this.exerciseNameInputRef.value !== '') {
                  this.setState({
                    isModalOpen: false,
                    modalError: null,
                  });
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
                } else {
                  this.setState({modalError: `You must provide an exercise name!`});
                }
              }}
            >
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }

  renderWorkoutSetsInputs() {
    const {workoutSets} = this.state;

    return (
      <div className="create__workout-sets">
        {workoutSets.map((workoutSet, index) => this.renderWorkoutSetInputs(workoutSet, index))}
        <div className="create__new-workout-set-button">
          <Button
            size="lg"
            onClick={() => {
              this.setState({
                workoutSets: [...workoutSets, {}]
              });
            }}
            block
          >
            Add set
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const canSubmit = (
      !!this.state.workoutSets.length
      && this.state.workoutSets.every(workoutSet => (
        workoutSet.exerciseId
        && workoutSet.restInterval
        && workoutSet.targetReps
      ))
    );
    return (
      <div className="create">
        <Container>
          <Row>
            <Col>
              <Form>
                <input
                  className="create__workout-name-input"
                  type="text"
                  placeholder="Workout name"
                  ref={(nameInputRef) => this.nameInputRef = nameInputRef as HTMLInputElement}
                  onChange={() => this.setState({name: this.nameInputRef ? this.nameInputRef.value : undefined})}
                />
                {this.state.name ? this.renderWorkoutSetsInputs() : null}
                {canSubmit && (
                  <div className="create__submit-button">
                    <Button
                      size="lg"
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
                      block
                    >
                      Submit
                    </Button>
                  </div>
                )}
              </Form>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
