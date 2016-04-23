# Cat nap :cat:

This is a little cat-themed break timer. There are a few basic settings:

#### Work
How long would you like to work before a break is suggested? I recommend *55 minutes*.

#### Break
How long should your break be? I recommend *five minutes*.

#### Skips
If you're in the middle of something important, you might want to delay your break. Think
of this like a snooze button on an alarm clock. You can select 0 - 3 skips per break alert.

#### Tracking
The application will only increment its clock when it detects activity. Your options are
"mouse", seeing if the mouse cursor has moved in the last minute, and "windows", seeing if
the titles and order of your top three windows has changed. The latter is an attempt to
make this more functional for users who spend most of their time on their keyboards. I hope
to add some form of keyboard tracking soon.

If you disable both *mouse* and *windows*, the application just acts as a timer.

## Installation

Check the releases for Windows and OSX installers.

## Building

Cat nap was made with Electron. You will need [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com/)).

```
# Clone catnap
git clone https://github.com/stevecat/catnap
# Go into the catnap directory
cd catnap
# Install dependencies and run the app
npm install && npm start
```

You can then run `npm start` after each change.

I've tried to keep the code neat and commented. Where I've failed in that, I'll tidy up
over time.

Learn more about Electron and its API in the [documentation](http://electron.atom.io/docs/latest).

## Problems?

Create an issue or, if you're feeling kind, a pull request.

stevecat :heart:

#### License [CC0 (Public Domain)](LICENSE.md)
