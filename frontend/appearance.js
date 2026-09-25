'use strict';
const binderColors=['olive','charcoal','oxblood','navy','mint','lavender','cream','retro'];
const binderStyles=['modern','classic','soft'];
function applyBinderAppearance(a){if(!a||!binderColors.includes(a.color)||!binderStyles.includes(a.style))return;document.body.dataset.binderTheme=a.color;document.body.dataset.binderStyle=a.style;document.body.dataset.rings=String(a.rings===true);}
