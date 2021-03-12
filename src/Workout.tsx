import './Workout.scss';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {withRouter, RouteComponentProps} from "react-router";
import {Link} from 'react-router-dom';
import * as lodash from 'lodash';
import Countdown from 'react-countdown';

import {ExerciseLogging} from './ExerciseLogging';
import {WorkoutSummary} from './WorkoutSummary';
import {Exercise, Workout as WorkoutType, WorkoutSet, WorkoutSubset, WorkoutLog} from './types';
import {PageLoadSpinner} from './PageLoadSpinner';
import {WorkoutSetHistory, workoutSetHasHistory} from './WorkoutSetHistory';


interface WorkoutProps extends RouteComponentProps<{id: string}> {
  user: firebase.User;
}

interface WorkoutState {
  isRunning: boolean;
  workout?: WorkoutType;
  currentWorkoutSetId: string | null;
  exercises?: {[key: string]: Exercise},
  workoutLogs?: {[key: string]: WorkoutLog} | null;
  isResting: boolean;
  workoutLogRef?: firebase.database.Reference;
  isFinished: boolean;
  setsCompleted: number;
  finishedSetIds: string[];
  skippedSetIds: string[];
  snoozedSetIds: string[];
  start?: number;
  end?: number;
  loggingSubsets: WorkoutSubset[];
  loggingNotes?: string;
  nextWorkoutSetDate?: number;
  showMiniCountdown: boolean;
}

class WorkoutWithoutRouter extends React.Component<WorkoutProps, WorkoutState> {
  constructor(props: WorkoutProps) {
    super(props);
    this.state = {
      isRunning: false,
      currentWorkoutSetId: null,
      isResting: false,
      isFinished: false,
      setsCompleted: 0,
      finishedSetIds: [],
      skippedSetIds: [],
      snoozedSetIds: [],
      loggingSubsets: [],
      showMiniCountdown: false,
    };
    this.renderActiveWorkout = this.renderActiveWorkout.bind(this);
    this.renderStagingWorkout = this.renderStagingWorkout.bind(this);
    this.handleExerciseLoggingSubmit = this.handleExerciseLoggingSubmit.bind(this);
    this.isFinished = this.isFinished.bind(this);
  }

  componentDidMount() {
    firebase.database().ref(
      `workouts/${this.props.user.uid}/${this.props.match.params.id}`
    ).once('value', (snapshot) => {
      const workout = snapshot.val();
      if(workout && workout.name && workout.workoutSets) {
        this.setState({workout});
        firebase.database().ref(
          `workouts/${this.props.user.uid}/${this.props.match.params.id}`
        ).update({
          lastAccessed: Date.now(),
        });
      } else {
        this.setState({workout: null});
      }
    });
    firebase.database().ref(
      `exercises/${this.props.user.uid}`
    ).on('value', (snapshot) => {
      this.setState({exercises: snapshot.val()});
    });
    firebase.database().ref(
      `workoutLogs/${this.props.user.uid}`
    ).orderByChild('workoutId').equalTo(this.props.match.params.id).limitToLast(3).on('value', (snapshot) => {
      this.setState({workoutLogs: snapshot.val()});
    });
  }

  componentDidUpdate(prevProps: WorkoutProps, prevState: WorkoutState) {
    if(this.state.workout && !prevState.isResting && this.state.isResting) {
      const currentWorkoutSet = this.state.workout.workoutSets[this.state.currentWorkoutSetId];
      this.setState({
        nextWorkoutSetDate: Date.now() + Number(currentWorkoutSet.restInterval) * 1000,
        showMiniCountdown: false,
      })
    }

    if(prevState.isResting && !this.state.isResting) {
      this.setState({showMiniCountdown: this.state.nextWorkoutSetDate > Date.now() + 5000});
    }

    if(this.state.workout && !prevState.isRunning && this.state.isRunning) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }

    if(!prevState.isRunning && this.state.isRunning) {
      const workoutLogRef = firebase.database().ref(`workoutLogs/${this.props.user.uid}`).push();
      const start = Date.now()
      workoutLogRef.set({
        start,
        workoutId: this.props.match.params.id,
      })
      this.setState({workoutLogRef, start});
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    if(!prevState.isFinished && this.state.isFinished) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      if(this.state.workoutLogRef) {
        const end = Date.now();
        this.state.workoutLogRef.update({end});
        this.setState({
          end,
          currentWorkoutSetId: null,
        });
      }
    }

    const addedFinishedSet = prevState.finishedSetIds.length < this.state.finishedSetIds.length;
    const addedSkippedSet = prevState.skippedSetIds.length < this.state.skippedSetIds.length;
    if(addedFinishedSet || addedSkippedSet) {
      const snoozedSetIds = lodash.difference(
        this.state.snoozedSetIds,
        this.state.finishedSetIds,
        this.state.skippedSetIds,
      );
      this.setState({
        snoozedSetIds,
        setsCompleted: this.state.setsCompleted + this.state.finishedSetIds.length - prevState.skippedSetIds.length,
        isFinished: this.isFinished(),
        currentWorkoutSetId: this.getNextWorkoutSetId(),
        isResting: false,
      });
    }

    const addedSnoozedSet = prevState.snoozedSetIds.length < this.state.snoozedSetIds.length;
    if(addedSnoozedSet) {
      this.setState({
        currentWorkoutSetId: this.getNextWorkoutSetId(),
      });
    }
  }

  isFinished() {
    const {finishedSetIds, skippedSetIds, workout} = this.state;
    return finishedSetIds.length + skippedSetIds.length >= Object.keys(workout.workoutSets).length;
  }

  getNextWorkoutSetId(simulateSnoozed?: string): string | null {
    const {workout, finishedSetIds, skippedSetIds, currentWorkoutSetId} = this.state;
    const workoutSetIds = Object.keys(workout.workoutSets);
    const currentWorkoutSetIndex = workoutSetIds.indexOf(currentWorkoutSetId);

    let i = currentWorkoutSetIndex;
    do {
      i = (i + 1) > workoutSetIds.length - 1 ? 0 : (i + 1);
      const nextWorkoutSetId = workoutSetIds[i];
      if(
        !skippedSetIds.includes(nextWorkoutSetId)
        && !finishedSetIds.includes(nextWorkoutSetId)
        && nextWorkoutSetId !== currentWorkoutSetId
      ) {
        return nextWorkoutSetId;
      }
    } while (i !== currentWorkoutSetIndex)

    return null;
  }
  
  handleBeforeUnload(event) {
    event.returnValue = `Workout in progress. Are you sure you want to leave?`;
  }

  renderExerciseExecution(workoutSet: WorkoutSet, exercise: Exercise) {
    return (
      <div className="workout__active__exercise-execution">
        <p className="workout__active__target-reps">
          {`Target: ${workoutSet.targetReps} rep${workoutSet.targetReps === 1 ? '' : 's'}`}
        </p>
        {exercise.notes && <p className="workout__active__exercise-notes">{exercise.notes}</p>}
        {workoutSet.notes && <p className="workout__active__notes">{workoutSet.notes}</p>}
        {exercise.youtubeUrl && (
          <p className="workout__active__more-info">
            <a href={exercise.youtubeUrl} target="_blank">
              More info
            </a>
          </p>
        )}
      </div>
    );
  }

  async handleExerciseLoggingSubmit() {
    const {
      loggingSubsets,
      workoutLogRef,
      currentWorkoutSetId,
      setsCompleted,
      finishedSetIds,
      loggingNotes,
    } = this.state;

    if(workoutLogRef && currentWorkoutSetId) {
      workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).set({setsCompleted});
      loggingNotes && workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).update({notes: loggingNotes});
      const subsetsRef = workoutLogRef.child(`workoutSets/${currentWorkoutSetId}/subsets`);
      loggingSubsets.forEach(workoutSubset => subsetsRef.push().set(workoutSubset));
    }
    this.setState({
      finishedSetIds: [...finishedSetIds, currentWorkoutSetId],
    });
  }

  renderExerciseLoggingActions() {
    const {loggingSubsets} = this.state;

    if(loggingSubsets.length && loggingSubsets.every(({reps, weight}) => reps && weight)) {
      return (
        <Button
          className="exercise-logging__submit-button"
          onClick={this.handleExerciseLoggingSubmit}
        >
          Proceed
        </Button>
      )
    }

    return (
      <Alert variant="info" className="exercise-logging__alert">
        {`You must complete all the logging fields to continue.`}
      </Alert>
    );
  }

  renderExerciseExecutionActions() {
    const {currentWorkoutSetId, skippedSetIds, snoozedSetIds, workoutLogRef} = this.state;
    return (
      <>
        <Button
          variant="primary"
          className="workout__active__done-button"
          onClick={() => {
            this.setState({isResting: true});
          }}
        >
          Done!
        </Button>
        <Button
          variant="secondary"
          className="workout__active__skip-button float-right"
          onClick={() => {
            this.setState({skippedSetIds: [...skippedSetIds, currentWorkoutSetId]});
            if(workoutLogRef) {
              workoutLogRef.child(`workoutSets/${currentWorkoutSetId}`).update({
                skipped: true,
              })
            }
          }}
        >
          Skip
        </Button>
        {this.getNextWorkoutSetId(currentWorkoutSetId) !== currentWorkoutSetId && (
          <Button
            variant="warning"
            className="workout__active__snooze-button float-right"
            onClick={() => {
              this.setState({snoozedSetIds: [...snoozedSetIds, currentWorkoutSetId]});
            }}
          >
            Snooze
          </Button>
        )}
      </>
    );
  }

  renderFinishedWorkout() {
    const {start, end} = this.state;

    let workoutDuration;
    if(start && end) {
      const date = new Date(0);
      date.setMilliseconds(end - start);
      workoutDuration = date.toISOString().substr(11, 8);
    }

    return (
      <div className="workout__finished">
        <h1>All done! 💪</h1>
        {workoutDuration && (
          <p className="workout__finished__duration">
            {`Workout duration: ${workoutDuration}`}
          </p>
        )}
        <Link className="workout__finished__home-button" to="/">
          Back home
        </Link>
      </div>
    );
  }

  renderActiveWorkout() {
    const {
      workout,
      exercises,
      workoutLogs,
      currentWorkoutSetId,
      isResting,
      isFinished,
      nextWorkoutSetDate,
    } = this.state;
    
    if(isFinished) {
      return this.renderFinishedWorkout();
    }

    if(!currentWorkoutSetId || workoutLogs === undefined) {
      return <PageLoadSpinner />
    }

    const currentWorkoutSet = workout.workoutSets[currentWorkoutSetId];
    const currentExercise = exercises[currentWorkoutSet.exerciseId];
    
    return (
      <div className="workout__active">
        {this.state.showMiniCountdown && this.state.nextWorkoutSetDate && (
          <div className="workout__active__mini-countdown">
            <Countdown
              date={this.state.nextWorkoutSetDate}
              daysInHours={true}
              onComplete={() => {
                this.setState({showMiniCountdown: false});
              }}
            />
          </div>
        )}
        <Card>
          <Card.Body>
            <Card.Title>
              {currentExercise.name}
            </Card.Title>
            {isResting && this.state.nextWorkoutSetDate ?
              <ExerciseLogging
                workoutSet={currentWorkoutSet}
                exercise={currentExercise}
                onSubsetInputChange={(loggingSubsets) => {
                  this.setState({loggingSubsets});
                }}
                onNotesInputChange={(loggingNotes) => {
                  this.setState({loggingNotes});
                }}
                nextWorkoutSetDate={this.state.nextWorkoutSetDate}
              /> :
              this.renderExerciseExecution(currentWorkoutSet, currentExercise)
            }
          </Card.Body>
          <Card.Footer>
            {isResting ? this.renderExerciseLoggingActions() : this.renderExerciseExecutionActions()}
          </Card.Footer>
        </Card>
        {workoutSetHasHistory(workoutLogs, currentWorkoutSetId) && (
          <div className="workout__workout-set-history mt-5">
            <Card>
              <Card.Body>
                <Card.Title>
                  Recent History
                </Card.Title>
                <Card.Text>
                  <WorkoutSetHistory
                    workoutSetId={currentWorkoutSetId}
                    workoutLogs={workoutLogs}
                  />
                </Card.Text>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    );
  }

  renderWorkoutHistorySummary(workoutLogs: {[key: string]: WorkoutLog} | null) {
    if(workoutLogs) {
      const workoutLogsKeys = Object.keys(workoutLogs);
      const lastWorkoutLog = workoutLogs[workoutLogsKeys[workoutLogsKeys.length - 1]];
      if(lastWorkoutLog.start) {
        const lastWorkoutStartDate = new Date(lastWorkoutLog.start);
        return `You last did this workout on ${lastWorkoutStartDate.toISOString().slice(0,10)}`;
      }
    }

    return `You've never done this workout before.`;
  }

  renderStagingWorkout() {
    const {workout, exercises, workoutLogs} = this.state;
    const {user, match: {params}} = this.props;

    if(workout === null) {
      return (
        <Alert variant="warning">
          {`This workout doesn't exist!`}
        </Alert>
      );
    }

    return (
      <div className="workout__staging">
        <Card>
          <Card.Body>
            <Card.Title>
              <div className="workout__staging__header">
                {workout.name}
              </div>
            </Card.Title>
            <div className="workout__history-summary">
              {this.renderWorkoutHistorySummary(workoutLogs)}
            </div>
          </Card.Body>
          <Card.Footer>
            <Button
              variant="primary"
              className="workout__staging__start-button"
              onClick={() => {
                this.setState({isRunning: true});
              }}
            >
              Start workout
            </Button>
            <Button
              variant="danger"
              className="workout__staging__delete-button float-right"
              onClick={() => {
                const workoutRef = firebase.database().ref(`workouts/${user.uid}/${params.id}`);
                workoutRef.remove().then(() => {
                  window.location.pathname = '/';
                })
              }}
            >
              Delete workout
            </Button>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  render() {
    const {workout, exercises, workoutLogs} = this.state;
    
    return (
      <div className="workout">
        {!workout || !exercises || workoutLogs === undefined ? <PageLoadSpinner /> : (
          <Container>
            <Row>
              <Col xs={12}>
                {this.state.isRunning ? this.renderActiveWorkout() : this.renderStagingWorkout()}
              </Col>
            </Row>
            <Row>
              <Col xs={12}>
                <div className="workout__workout-summary mt-5">
                  <WorkoutSummary
                    workout={workout}
                    exercises={exercises}
                    workoutLogs={workoutLogs}
                    currentWorkoutSetId={this.state.currentWorkoutSetId}
                    finishedSetIds={this.state.finishedSetIds}
                    skippedSetIds={this.state.skippedSetIds}
                    snoozedSetIds={this.state.snoozedSetIds}
                  />
                </div>
              </Col>
            </Row>
          </Container>
        )}
      </div>
    );
  }
}

export const Workout = withRouter<WorkoutProps, typeof WorkoutWithoutRouter>(WorkoutWithoutRouter);