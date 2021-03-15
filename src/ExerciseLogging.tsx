import './ExerciseLogging.scss';

import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import React from 'react';
import Countdown from 'react-countdown';

import {Exercise, WorkoutSet, WorkoutSubset} from './types';

interface ExerciseLoggingProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  onSubsetInputChange: (workoutSubsets: WorkoutSubset[]) => void;
  onNotesInputChange: (notes: string) => void;
  nextWorkoutSetDate: number;
}

interface ExerciseLoggingState {
  subsets: WorkoutSubset[];
  countdownComplete: boolean;
  notes?: string;
}

export class ExerciseLogging extends React.Component<ExerciseLoggingProps, ExerciseLoggingState> {
  subsetRepsInputRefs: HTMLInputElement[] = [];
  subsetWeightInputRefs: HTMLInputElement[] = [];
  notesRef: HTMLInputElement;

  constructor(props: ExerciseLoggingProps) {
    super(props);
    this.state = {
      subsets: [{
        reps: props.workoutSet.targetReps,
      }],
      countdownComplete: false,
    };
  }

  componentDidMount() {
    if(this.subsetRepsInputRefs[0]) {
      this.subsetRepsInputRefs[0].value = String(this.props.workoutSet.targetReps);
      this.subsetRepsInputRefs[0].focus();
      this.subsetRepsInputRefs[0].select();
    }

    this.props.onSubsetInputChange(this.state.subsets);
  }

  componentDidUpdate(prevProps: ExerciseLoggingProps, prevState: ExerciseLoggingState) {
    if(prevState.subsets !== this.state.subsets) {
      this.props.onSubsetInputChange(this.state.subsets);
    }

    if(prevState.notes !== this.state.notes && this.state.notes) {
      this.props.onNotesInputChange(this.state.notes);
    }

    if(prevState.subsets.length < this.state.subsets.length) {
      const lastSubsetRepsInputRef = this.subsetRepsInputRefs[this.subsetRepsInputRefs.length-1];
      if(lastSubsetRepsInputRef) {
        lastSubsetRepsInputRef.focus();
      }
    }
  }

  renderWorkoutSubset(subset: WorkoutSubset, index: number) {
    const updateWorkoutSubset = (prop: string, value: any) => {
      let subsets = [...this.state.subsets];
      // @ts-ignore
      subsets[index][prop as keyof WorkoutSubset] = value;
      this.setState({subsets});
    };

    return (
      <ListGroup.Item variant="flush" key={index}>
        <Row className="align-items-center">
          <Col xs={4}>
            <Form.Group controlId={`subsetReps-${index}`}>
              <Form.Label><span className="text-nowrap">Reps</span></Form.Label>
              <Form.Control
                type="number"
                className="exercise-logging__subset__reps"
                ref={(subsetRepsInputRef => this.subsetRepsInputRefs[index] = subsetRepsInputRef)}
                onChange={() => {
                  updateWorkoutSubset('reps', this.subsetRepsInputRefs[index].value);
                }}
              />
            </Form.Group>
          </Col>
          <Col xs={4}>
            <Form.Group controlId={`subsetWeight-${index}`}>
              <Form.Label><span className="text-nowrap">Weight (lbs)</span></Form.Label>
              <Form.Control
                type="number"
                className="exercise-logging__subset__weight"
                ref={(subsetWeightInputRef => this.subsetWeightInputRefs[index] = subsetWeightInputRef)}
                onChange={() => {
                  updateWorkoutSubset('weight', this.subsetWeightInputRefs[index].value);
                }}
              />
            </Form.Group>
          </Col>
          <Col xs={4}>
            {subset.reps && subset.weight && index + 1 === this.state.subsets.length && (
              <Button
                variant="primary"
                size="sm"
                className="exercise-logging__add-logging-input-button"
                onClick={() => {
                  const subsets = [...this.state.subsets, {}];
                  this.setState({subsets});
                }}
              >
                Add
              </Button>
            )}
            {!!index && (
              <Button
                variant="danger"
                size="sm"
                className="exercise-logging__add-logging-input-button"
                onClick={() => {
                  const subsets = [...this.state.subsets];
                  subsets.splice(index, 1);
                  this.setState({subsets});
                }}
              >
                Remove
              </Button>
            )} 
          </Col> 
        </Row>      
      </ListGroup.Item>
    );
  }
  
  render() {
    const {subsets} = this.state;
    return (
      <div className="exercise-logging">
        <div className={`
          exercise-logging__countdown
          ${this.state.countdownComplete ? 'exercise-logging__countdown--complete' : ''}
        `}>
          <Countdown
            date={this.props.nextWorkoutSetDate}
            overtime={true}
            daysInHours={true}
            onComplete={() => {
              this.setState({countdownComplete: true});
            }}
          />
        </div>
        <div className="exercise-logging__subsets">
          <Form>
            <ListGroup variant="flush">
              {subsets.map((subset, index) => this.renderWorkoutSubset(subset, index))}
            </ListGroup>
          </Form>
        </div>
        <div className="exercise-logging__notes">
          <Form.Group controlId={`notes`}>
            <Form.Label><span className="text-nowrap">Notes</span></Form.Label>
            <Form.Control
              type="text"
              className="exercise-logging__notes__input"
              ref={(notesRef => this.notesRef = notesRef)}
              onChange={() => {
                this.setState({notes: this.notesRef.value});
              }}
            />
          </Form.Group>
        </div>
      </div>
    );
  }
}