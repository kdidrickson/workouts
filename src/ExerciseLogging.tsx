import './ExerciseLogging.scss';

import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import React from 'react';
import Countdown from 'react-countdown';

import {Exercise, WorkoutSet, WorkoutSubset, WorkoutLog} from './types';

interface ExerciseLoggingProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  onSubsetInputChange: (workoutSubsets: WorkoutSubset[]) => void;
}

interface ExerciseLoggingState {
  subsets: WorkoutSubset[];
  countdownComplete: boolean;
}

export class ExerciseLogging extends React.Component<ExerciseLoggingProps, ExerciseLoggingState> {
  subsetRepsInputRefs: HTMLInputElement[] = [];
  subsetWeightInputRefs: HTMLInputElement[] = [];
  nextWorkoutSetDate: number

  constructor(props: ExerciseLoggingProps) {
    super(props);
    this.state = {
      subsets: [{
        reps: props.workoutSet.targetReps,
      }],
      countdownComplete: false,
    };
    this.nextWorkoutSetDate = Date.now() + props.workoutSet.restInterval * 1000;
  }

  componentDidMount() {
    if(this.subsetRepsInputRefs[0]) {
      this.subsetRepsInputRefs[0].value = String(this.props.workoutSet.targetReps);
      this.subsetRepsInputRefs[0].focus();
    }

    this.props.onSubsetInputChange(this.state.subsets);
  }

  componentDidUpdate(prevProps: ExerciseLoggingProps, prevState: ExerciseLoggingState) {
    if(prevState.subsets !== this.state.subsets) {
      this.props.onSubsetInputChange(this.state.subsets);
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
            date={this.nextWorkoutSetDate}
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
      </div>
    );
  }
}