/**
 * The different states that can cause the colour of the icon to change
 */
export const enum States { Normal, Progress, Paused, Success, Error, };

let isDarkMode = false;

const lightMode = new Map<States, string>([
  [ States.Normal, '#5e5e5e' ],
  [ States.Progress, '#2566ff' ],
  [ States.Paused, 'yellow' ],
  [ States.Success, '#0bbf29' ],
  [ States.Error, 'red' ],
]);

const darkMode = new Map<States, string>([
  [ States.Normal, 'white' ],
  [ States.Progress, '#2566ff' ],
  [ States.Paused, 'yellow' ],
  [ States.Success, '#0bbf29' ],
  [ States.Error, 'red' ],
]);

export const getColor = (state: States) => {
  return (isDarkMode ? darkMode : lightMode).get(state);
}