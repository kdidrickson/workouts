import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {Link} from "react-router-dom";
import {Workout} from './types';

interface HomeProps {
  user: firebase.User;
}

interface HomeState {
  workouts: Workout[] | null;
}

export class Home extends React.Component<HomeProps, HomeState> {
  constructor(props: HomeProps) {
    super(props);
    this.state = {
      workouts: null,
    }
    this.renderWorkouts = this.renderWorkouts.bind(this);
  }

  componentDidMount() {
    const {user: {uid}} = this.props;
    firebase.database().ref(`workouts/${uid}`).on('value', (snapshot) => {
      const workoutsSnapshot = snapshot.val();
      if(workoutsSnapshot) {
        const workouts = Object.keys(workoutsSnapshot).map(id => ({id, ...workoutsSnapshot[id]}));
        this.setState({workouts});
      }
    });
  }

  renderWorkouts() {
    const {workouts} = this.state;

    if(!workouts) {
      return null;
    }

    return (
      <div className="home__workouts">
        {workouts.map(workout => (
          <Link to={`/workout/${workout.id}`}>
            {workout.name}
          </Link>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div className="home">
        {this.renderWorkouts()}
        <Link to="/create">
          Create a new workout
        </Link>
      </div>
    );
  }
}
