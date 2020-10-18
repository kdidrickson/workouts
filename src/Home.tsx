import './Home.scss';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';

import React from 'react';
import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import {Workout} from './types';
import {PageLoadSpinner} from './PageLoadSpinner';

interface HomeProps {
  user: firebase.User;
}

interface HomeState {
  workouts?: Workout[];
}

export class Home extends React.Component<HomeProps, HomeState> {
  constructor(props: HomeProps) {
    super(props);
    this.state = {
      workouts: undefined,
    };
    this.renderWorkouts = this.renderWorkouts.bind(this);
  }

  componentDidMount() {
    const {user: {uid}} = this.props;
    firebase.database().ref(`workouts/${uid}`).orderByChild('lastAccessed').on('value', (snapshot) => {
      let workouts: Workout[] = [];
      if(snapshot.val()) {
        snapshot.forEach(child => {
          workouts.push({
            id: child.key,
            ...child.val()
          });
        });
      }
      this.setState({workouts: workouts.reverse()});
    });
  }

  renderWorkouts(workouts: Workout[]) {
    return (
      <div className="home__workouts">
        <Row>
        {workouts.map(workout => (
          <Col xs={12} md={4} lg={3}>
            <div className="home__workout">
              <Card>
                <Card.Body>
                  <Card.Title>{workout.name}</Card.Title>
                  <Button href={`/workout/${workout.id}`} variant="primary">
                    Open
                  </Button>
                </Card.Body>
                <Card.Footer className="text-muted small">
                  {workout.lastAccessed ?
                    `Last accessed: ${new Date(workout.lastAccessed).toISOString().slice(0, 10)}` :
                    `Never accessed`
                  }
                </Card.Footer>
              </Card>
            </div>
          </Col>
        ))}
        </Row>
      </div>
    );
  }

  render() {
    const {workouts} = this.state;
    return (
      <div className="home">
        {workouts === undefined ? <PageLoadSpinner /> : (
          <Container>
            {this.renderWorkouts(workouts)}
            <div className="home__create-button">
              <Row>
                <Col xs={12}>
                  <Button size="lg" href="/create" block>
                    Create a new workout
                  </Button>
                </Col>
              </Row>
            </div>
          </Container>
        )}
      </div>
    );
  }
}
