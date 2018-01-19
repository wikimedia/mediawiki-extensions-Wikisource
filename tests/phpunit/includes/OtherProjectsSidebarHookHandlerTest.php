<?php

namespace MediaWiki\Extension\Wikisource;

use HashSiteStore;
use Language;
use MediaWikiTestCase;
use TestSites;
use Wikibase\Client\Hooks\SidebarLinkBadgeDisplay;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\EntityLookupException;
use Wikibase\DataModel\Services\Lookup\InMemoryEntityLookup;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Term\Term;

/**
 * @covers \MediaWiki\Extension\Wikisource\OtherProjectsSidebarHookHandler
 *
 * @group Wikisource
 *
 * @license GPL-2.0-or-later
 * @author Thomas Pellissier Tanon
 */
class OtherProjectsSidebarHookHandlerTest extends MediaWikiTestCase {

	/**
	 * @dataProvider doAddToSidebarProvider
	 */
	public function testDoAddToSidebar(
		array $expected,
		array $sidebar,
		ItemId $itemId
	) {
		$entityLookup = $this->getEntityLookup();
		$handler = new OtherProjectsSidebarHookHandler(
			$entityLookup,
			new EditionLookup(
				$entityLookup,
				new PropertyId( 'P747' ),
				new PropertyId( 'P629' )
			),
			new HashSiteStore( TestSites::getSites() ),
			$this->getSidebarLinkBadgeDisplay(),
			[ 'enwiki', 'enwiktionary' ]
		);
		$handler->doAddToSidebar( $itemId, $sidebar );
		$this->assertEquals( $expected, $sidebar );
	}

	public function doAddToSidebarProvider() {
		$wikipediaLink = [
			'msg' => 'wikibase-otherprojects-wikipedia',
			'class' => 'wb-otherproject-link wb-otherproject-wikipedia',
			'href' => 'https://en.wikipedia.org/wiki/Foo',
			'hreflang' => 'en'
		];
		$wiktionaryLink = [
			'msg' => 'wikibase-otherprojects-wiktionary',
			'class' => 'wb-otherproject-link wb-otherproject-wiktionary badge-Q4242 badge-class',
			'href' => 'https://en.wiktionary.org/wiki/Bar',
			'hreflang' => 'en',
			'itemtitle' => 'badge'
		];
		$existingWikipediaLink = [
			'msg' => 'wikibase-otherprojects-wikipedia',
			'class' => 'wb-otherproject-link wb-otherproject-wikipedia',
			'href' => 'https://en.wikipedia.org/wiki/Baz',
			'hreflang' => 'en'
		];
		return [
			'Item with work' => [
				[
					'wikipedia' => [ 'enwiki' => $wikipediaLink ],
					'wiktionary' => [ 'enwiktionary' => $wiktionaryLink ]
				],
				[],
				new ItemId( 'Q1' )
			],
			'Item with work with existing' => [
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ],
					'wiktionary' => [ 'enwiktionary' => $wiktionaryLink ]
				],
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ],
				],
				new ItemId( 'Q1' )
			],
			'Item without work' => [
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ]
				],
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ],
				],
				new ItemId( 'Q2' )
			],
			'Not existing item' => [
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ]
				],
				[
					'wikipedia' => [ 'enwiki' => $existingWikipediaLink ],
				],
				new ItemId( 'Q3' )
			],
		];
	}

	private function getEntityLookup() {
		$entityLookup = new InMemoryEntityLookup();
		$item = new Item( new ItemId( 'Q1' ) );
		$item->getStatements()->addNewStatement(
			new PropertyValueSnak(
				new PropertyId( 'P629' ),
				new EntityIdValue( new ItemId( 'Q2' ) )
			)
		);
		$item->getStatements()->addNewStatement(
			new PropertySomeValueSnak(
				new PropertyId( 'P629' )
			)
		);
		$entityLookup->addEntity( $item );

		$item = new Item( new ItemId( 'Q2' ) );
		$item->getSiteLinkList()->addNewSiteLink( 'enwiki', 'Foo' );
		$item->getSiteLinkList()->addNewSiteLink( 'enwiktionary', 'Bar', [ new ItemId( 'Q4242' ) ] );
		$entityLookup->addEntity( $item );

		$entityLookup->addException( new EntityLookupException( new ItemId( 'Q3' ) ) );
		return $entityLookup;
	}

	private function getSidebarLinkBadgeDisplay() {
		$labelDescriptionLookup = $this->getMock( LabelDescriptionLookup::class );
		$labelDescriptionLookup->method( 'getLabel' )
			->with( new ItemId( 'Q4242' ) )
			->will( $this->returnValue( new Term( 'en',  'badge' ) ) );

		return new SidebarLinkBadgeDisplay(
			$labelDescriptionLookup,
			[ 'Q4242' => 'badge-class' ],
			Language::factory( 'en' )
		);
	}

}
