const cliOpts = parseCliOptions(process.argv.slice(2))

if (cliOpts.help) {
	printUsage()
	process.exit(0)
}

const fs = require('fs')
const path = require('path')

const mustache = require('art-template')

const parseBookmarks = require('./bookmarks-parser.js')
const parseReference = require('./parse-reference.js')
const getBibleHtml = require('./get-bible-html.js')
const hashFile = require('./hash-file.js')
const proudVsBroken = require('./constant/proud-vs-broken.json')
const meditate = require('./constant/meditate.json')

const bookmarksTxt = fs.readFileSync(__dirname + '/constant/bookmarks.txt', 'utf-8')
const dtpm = parseBookmarks(bookmarksTxt)
// console.log(JSON.stringify(dtpm, null, 2));process.exit()

const { monthNames, expectedMonthLength, shortMonthNames } = require('./constant/months.json')

const opts = {
	cssRevHash: hashFile('style', 'css'),
	utilRevHash: hashFile('util', 'js'),
	year: new Date().getUTCFullYear(),
}

if (cliOpts.debug) {
	generateCommonFiles(opts)

	generateDayHtml(1, 1, opts)
	generateDayHtml(1, 2, opts)
	generateDayHtml(1, 3, opts)
	console.log('\nSkipping the daily pages other than Jan 1,2,3')
	console.log('Open localcanondaily.com in your browser.\n')
} else if (cliOpts.month) {
	generateCommonFiles(opts)

	const mMonth = parseInt(cliOpts.month, 10)
	if (mMonth < 1 || mMonth > 12) throw new RangeError('Unexpected value for month cli argument')

	for (let mDay = 1; mDay <= expectedMonthLength[mMonth]; mDay++) {
		generateDayHtml(mMonth, mDay, opts)
	}
	console.log('\nOnly generating for month ' + mMonth)
} else if (cliOpts.run) {
	generateCommonFiles(opts)

	for (let rMonth = 1; rMonth <= 12; rMonth++) {
		for (let rDay = 1; rDay <= expectedMonthLength[rMonth]; rDay++) {
			generateDayHtml(rMonth, rDay, opts)
		}
	}
} else {
	printUsage()
	process.exit(1)
}

function printUsage() {
	console.log('Usage: node . [options]')
	console.log('node . --help      Print this help text')
	console.log('node . run         Run the generator')
	console.log('node . debug       Skip generating all daily pages, except for January 1-3')
	console.log('node . month=n     Generate for a month. n must be between 1 and 12')
}

function generateCommonFiles(opts) {
	writeSubtemplate('index.html', {
		subtemplate: './calendar.art',
		title: 'Canon Daily',
		cssRevHash: opts.cssRevHash,
		utilRevHash: opts.utilRevHash,
		range,
		expectedMonthLength,
		monthNames,
		monthNamesJson: JSON.stringify(monthNames),
		shortMonthNames,
		dayOfWeek: getDayOfWeekOffset(opts.year),
		leapYear: getLeapYear(opts.year),
	})

	writeSubtemplate('prayer-for-filling-of-spirit.html', {
		subtemplate: './prayer-for-filling-of-spirit.art',
		title: 'Prayer for the Filling of the Spirit - Canon Daily',
		cssRevHash: opts.cssRevHash,
	})

	writeSubtemplate('bulk-edit.html', {
		subtemplate: './bulk-edit.art',
		title: 'Bulk Edit - Canon Daily',
		cssRevHash: opts.cssRevHash,
		utilRevHash: opts.utilRevHash,
		range,
		expectedMonthLength,
		monthNames,
	})
}

function generateDayHtml(month, day, opts) {
	let backUrl = `./${ day - 1 }`
	if (month === 1 && day === 1) {
		backUrl = '../December/31'
	} else if (day === 1) {
		backUrl = `../${ monthNames[month - 1] }/${ expectedMonthLength[month - 1] }`
	}
	let nextUrl = `./${ day + 1 }`
	if (month === 12 && day === 31) {
		nextUrl = '../January/1'
	} else if (day === expectedMonthLength[month]) {
		nextUrl = `../${ monthNames[month + 1] }/1`
	}

	writeSubtemplate(monthNames[month] + '/' + day + '.html', {
		subtemplate: './day.art',
		title: `${ monthNames[month] } ${ day } - Canon Daily`,
		cssRevHash: opts.cssRevHash,
		utilRevHash: opts.utilRevHash,
		month,
		day,
		proudVsBroken: proudVsBroken[day - 1],
		meditate: meditate[day - 1],
		bibleHtml: dtpm.map(d => d[month][day]).map(parseReference).map(getBibleHtml).join('\n'),
		monthNames,
		expectedMonthLength,
		backUrl,
		nextUrl,
	})
}

function parseCliOptions(args) {
	return args.reduce((memo, arg) => {
		const parts = arg.replace(/^--/, '').split('=')
		memo[ parts[0].toLowerCase() ] = parts[1] || true
		return memo
	}, {})
}

function writeSubtemplate(resultName, data) {
	const templateHtmlPath = path.resolve(__dirname, 'template', 'master.art')
	const resultHtmlPath = path.resolve(__dirname, '..', resultName)
	const resultHtml = mustache(templateHtmlPath, data)
	fs.writeFileSync(resultHtmlPath, resultHtml, 'utf-8')
}

function range(start, end) {
	return Array(end - start + 1).fill().map((_, i) => i + start) // *new* Array?
}

function getDayOfWeekOffset(year) {
	const jan1 = new Date(year, 0)
	jan1.setUTCHours(0)
	return (jan1.getDay() + 1) % 7
}

function getLeapYear(year) {
	// https://stackoverflow.com/a/16353241/1509389
	return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)
}
