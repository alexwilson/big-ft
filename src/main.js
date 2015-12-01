/* global $, mina */
/* eslint-env browser */
'use strict';
require('core-js');
global.$ = global.jQuery = require('jquery');
const moment = require('moment-timezone');
// global.Snap = require('snapsvg');
const queryString = require('query-string');
const SVGLoader = require('./js/svgloader');
require('./js/ticker');


/*
	Customisation
	?primaryType=topStories
	&primarySearch=
	&primaryOffset=0
	&primaryMax=3
	&secondaryType=search
	&secondarySearch=banks
	&secondaryOffset=0
	&secondaryMax=10
*/

const parsed = queryString.parse(location.search);

const primaryType = parsed.primaryType;
const primarySearch = parsed.primarySearch;
const primaryOffset = isNaN(parseInt(parsed.primaryOffset)) ? 0 : parseInt(parsed.primaryOffset);
const primaryMax = isNaN(parseInt(parsed.primaryMax)) ? 10 : parseInt(parsed.primaryMax);

const secondaryType = parsed.secondaryType;
const secondarySearch = parsed.secondarySearch;
const secondaryOffset = isNaN(parseInt(parsed.secondaryOffset)) ? 0 : parseInt(parsed.secondaryOffset);
const secondaryMax = isNaN(parseInt(parsed.secondaryMax)) ? 10 : parseInt(parsed.secondaryMax);

const serviceUrl = '/data';
const topStoriesUrl = serviceUrl + '/top-stories';
const searchStoriesUrl = serviceUrl + '/search';

function wait(ms) {
	return new Promise(function(resolve, reject) {
		setTimeout(resolve, ms);
	});
}

function getStories(type, offset, amount, term) {
	switch (type) {
		case 'search':
			return getSearchStories(offset, amount, term);
			break
		case 'topStories':
			return getTopStories(offset, amount);
			break;
		default:
			return getTopStories(offset, amount);
	}
}

function getTopStories (offset, amount) {
	return fetch(topStoriesUrl + '?startFrom=' + offset + '&numberOfArticles=' + amount)
		.then(function(response) {
			return response.json();
		})
	;
}

function getSearchStories (offset, amount, term) {
	return fetch(searchStoriesUrl + '?startFrom=' + offset + '&numberOfArticles=' + amount + '&keyword=' + term)
		.then(function(response) {
			return response.json();
		})
	;
}

var __bigFT = (function(){

	const updateInterval = 60 * 1000;
	const lastUpdated = document.getElementsByClassName('last-updated')[0];
	const interstitial = new SVGLoader( document.getElementById( 'loader' ), { speedIn : 700, easingIn : mina.easeinout } );

	const newsTicker = $('.ticker').ticker();
	const mediaHolder = document.getElementsByClassName('main-stories')[0];
	const clocks = document.querySelectorAll('[data-tz]');

	const openingHour = 9;
	const closingHour = 18;

	var mainStoryTransition = undefined;

	function prepareMainStories(stories){

		return new Promise(function(resolve, reject){

			var media = document.createElement('div');
			var headlines = document.createElement('ol');
			var images = [];

			media.setAttribute('class', 'main-stories__media-container');
			headlines.setAttribute('class', 'main-stories__headlines flex-col');

			stories.forEach(function(story, idx){

				var img = new Image();
				var text = document.createElement('li');

				var imgClass = 'main-stories__media';
				var textClass = 'main-stories__story';

				if(idx === 0){
					imgClass += ' main-stories__media--current';
					textClass += ' main-stories__story--current'
				}

				img.setAttribute('class', imgClass);
				text.setAttribute('class', textClass);

				img.src = story.image;
				images.push(new Promise(function(resolve, reject){
						img.onload = resolve(img);
						img.onerror = reject();
					})
				)

				text.textContent = story.headline;
				headlines.appendChild(text);

			});

			Promise.all(images)
				.then(function(images){

					images.forEach(function(image){

						media.appendChild(image);

					});

					resolve({
						media : media,
						headlines : headlines
					});

				})
				.catch(function(){
					reject();
				})
			;

		});

	}

	function populateMainStories(content){

		return new Promise(function(resolve){

			mediaHolder.innerHTML = '';

			mediaHolder.appendChild(content.media);
			mediaHolder.appendChild(content.headlines);

			resolve();

		});

	}

	var tickerMessageIds = [];
	function populateTicker (stories) {

		return new Promise(function (resolve) {
			tickerMessageIds.forEach(function (id) {
				console.log('removing', id)
				newsTicker.removeMsg(id);
			});

			tickerMessageIds = stories.map(function (story) {
				return newsTicker.addMsg(story.headline);
			});

			newsTicker.start();

			resolve();

		});

	}

	function checkForChangesSecondary (newStories, oldStories) {

		if (oldStories.length < newStories.length) {
			return Promise.resolve(newStories);
		};

		return new Promise(function(resolve, reject){

			const oldHeadlines = oldStories.map((a,b,c) => b.textContent.toLowerCase()).sort();
			const newHeadlines = newStories.map(story => story.headline.toLowerCase()).sort();

			var thereWasADifference = newHeadlines.some((story, index) => story !== oldHeadlines[index]);

			if (thereWasADifference) {
				resolve(newStories);
			} else {
				reject();
			}

		});

	}

	function checkForChanges(newStories, oldStories){

		if (oldStories.length < newStories.length) {
			return Promise.resolve(newStories);
		};

		return new Promise(function(resolve, reject){

			var thereWasADifference = newStories.some(function(story, idx){

				var oldStory = oldStories[idx].textContent.toLowerCase();
				var newStory = story.headline.toLowerCase();

				return newStory !== oldStory;

			});

			if(thereWasADifference){
				resolve(newStories);
			} else {
				reject();
			}

		});

	}

	function nextMainStory() {
		['main-stories__story--current', 'main-stories__media--current'].forEach(function(c) {
			var existing = $('.'+c);
			existing.removeClass(c).next().addClass(c);
			if (!$('.'+c).length) {
				existing.parent().children().eq(0).addClass(c);
			}
		});
	}

	function getUniqueStories (stories) {
		const storyHeadlines = stories.map(story => story.headline);
		const uniqueStoryHeadlines = Array(...new Set(storyHeadlines));
		const uniqueStories = uniqueStoryHeadlines.map(headline =>
			stories.find(story => story.headline === headline)
		);
		return uniqueStories;
	}

	function sizeHeadlineTextAccordingly(){

		const headlineEls = Array.from(document.getElementsByClassName('main-stories__story'));
		const footer = document.getElementsByClassName('footer')[0];

		// Increasing the amp value DECREASES the font size.
		var amp = 1;

		return new Promise(function(resolve, reject){

				headlineEls.forEach(function(headline){
					window.fitText(headline, amp);
				});	

				while((footer.offsetTop + footer.offsetHeight) > window.innerHeight){
				
					headlineEls.forEach(function(headline){
						window.fitText(headline, amp);
					});

					amp += 0.1;

				}

				resolve();

			})
		;

	}

	function updateContent(){
		const primaryStories = getStories(primaryType, primaryOffset, primaryMax, primarySearch);
		const secondaryStories = getStories(secondaryType, secondaryOffset, secondaryMax, secondarySearch);

		Promise.all([primaryStories, secondaryStories])
			.then(function(stories) {
				const primaryStories = getUniqueStories(stories[0]).slice(0,3);
				const secondaryStories = getUniqueStories(stories[1]);
				const uniqueSecondaryStories = secondaryStories
				.filter(secondaryStory =>
					!primaryStories.some(primaryStory =>
						secondaryStory.headline === primaryStory.headline
					)
				)

				const oldMsgs = newsTicker.getMsgs();

				checkForChangesSecondary(uniqueSecondaryStories, oldMsgs)
				.then(() => (console.log('Ticker contents changed.'), populateTicker(uniqueSecondaryStories)))
				.catch(() => console.log('Ticker contents didn\'t change.'))

				const oldStories = Array.prototype.slice.call(document.querySelectorAll('.main-stories__story'));

				return checkForChanges(primaryStories, oldStories)
					.then(function(){
						return prepareMainStories(primaryStories);
					})
					.then(function(content){

						interstitial.show();
						return wait(1000).then(function(){
							return populateMainStories(content).then( () => {
								sizeHeadlineTextAccordingly();
							});
						})

					})

				;

			})
			.then(function(){
				setTimeout(interstitial.hide.bind(interstitial), 1500);
				clearTimeout(mainStoryTransition);
				mainStoryTransition = setInterval(nextMainStory, 10000);
				lastUpdated.innerHTML = 'Last updated: ' + moment().format('HH:mm');
			})
			.catch(function(error){
				setTimeout(interstitial.hide.bind(interstitial), 5000);
				console.log('We have an error', error);
			})
		;


	}

	function updateClocks(){

		[].forEach.call(clocks, function(clock){

			const timezone = clock.getAttribute('data-tz');

			clock.innerHTML = moment().tz(timezone).format('HH:mm');

			const currentHour = moment.tz(timezone).hours();

			if(currentHour >= openingHour && currentHour < closingHour){
				$(clock).closest('li').removeClass('footer-cards__card--dim');
			} else {
				$(clock).closest('li').addClass('footer-cards__card--dim');
			}

		});

	}

	function initialise(){

		updateContent();
		updateClocks();

		setInterval(updateClocks, 60000);
		setInterval(updateContent, updateInterval);

	}

	return {
		init : initialise
	};

}());


$(function() {

	__bigFT.init();

});
