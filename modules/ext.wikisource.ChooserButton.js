/**
 * @constructor
 * @param {Object} config
 */
function ChooserButton( config ) {
	var url, formatIcon, downloadIcon, $label, $labelDesc, label;
	ChooserButton.super.call( this, config );

	// Attributes of the link.
	this.$element.addClass( 'ext-wikisource-ChooserButton' );

	// @TODO Use URL() here when it's permitted in MediaWiki.
	url = config.wsExportUrl +
		'?page=' + encodeURIComponent( mw.config.get( 'wgPageName' ) ) +
		'&lang=' + mw.config.get( 'wgContentLanguage' ) +
		'&format=' + config.format;
	this.$element.attr( 'href', url );

	// There are three parts to the contents of the link: format-icon, label, and download-icon.

	// Format icon.
	formatIcon = new OO.ui.IconWidget( {
		icon: config.icon,
		// Classes can be:
		// * ext-wikisource-icon-desktop-and-printer
		// * ext-wikisource-icon-laptop-and-mobile
		// * ext-wikisource-icon-tablet
		classes: [ 'ext-wikisource-format-icon', 'ext-wikisource-icon-' + config.icon ]
	} );

	// Download icon.
	downloadIcon = new OO.ui.IconWidget( {
		icon: 'download',
		flags: [ 'progressive' ],
		classes: [ 'ext-wikisource-download-icon' ]
	} );

	// Label (two parts: label and description).
	$label = $( '<span>' )
		// Messages can be:
		// * wikisource-download-chooser-epub
		// * wikisource-download-chooser-mobi
		// * wikisource-download-chooser-pdf
		.text( mw.msg( 'wikisource-download-chooser-' + config.format ) );
	$labelDesc = $( '<span>' )
		.addClass( 'ext-wikisource-description' )
		// Messages can be:
		// * wikisource-download-chooser-epub-description
		// * wikisource-download-chooser-mobi-description
		// * wikisource-download-chooser-pdf-description
		.text( mw.msg( 'wikisource-download-chooser-' + config.format + '-description' ) );
	$label.append( $labelDesc );
	label = new OO.ui.LabelWidget( {
		label: $label,
		classes: [ 'ext-wikisource-format-label' ]
	} );

	// Add it all to the link.
	this.$element.append(
		formatIcon.$element,
		label.$element,
		downloadIcon.$element
	);
}

OO.inheritClass( ChooserButton, OO.ui.Element );

ChooserButton.static.tagName = 'a';

module.exports = ChooserButton;
