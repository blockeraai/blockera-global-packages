/**
 * Deferred icon picker packs. Loaded on demand as `dist/icons-picker/icons-picker.js`.
 *
 * @package
 */

/**
 * Blockera dependencies
 */
import { registerIconLibraries } from '@blockera/icons';

/**
 * Internal dependencies
 */
import searchIndex2 from './search-index-2.json';
import { FaRegularIcons } from './library-faregular';
import { FaRegularIcon } from './library-faregular/icon';
import FaRegularIconsSearchData from './library-faregular/search-data.json';
import { FaBrandsIcons } from './library-fabrands';
import { FaBrandsIcon } from './library-fabrands/icon';
import FaBrandsIconsSearchData from './library-fabrands/search-data.json';
import { FaSolidIcons } from './library-fasolid';
import { FaSolidIcon } from './library-fasolid/icon';
import FaSolidIconsSearchData from './library-fasolid/search-data.json';
import { EssentialsIcons } from './library-essentials';
import { EssentialsIcon } from './library-essentials/icon';
import EssentialsIconsSearchData from './library-essentials/search-data.json';
import { FeatherIcons } from './library-feather';
import { FeatherIcon } from './library-feather';
import FeatherIconsSearchData from './library-feather/search-data.json';
import { LucideIcons } from './library-lucide';
import { LucideIcon } from './library-lucide';
import LucideIconsSearchData from './library-lucide/search-data.json';
import { UntitleduiIcons } from './library-untitledui';
import { UntitleduiIcon } from './library-untitledui';
import UntitleduiIconsSearchData from './library-untitledui/search-data.json';
import { TablerIcons } from './library-tabler';
import { TablerIcon } from './library-tabler';
import TablerIconsSearchData from './library-tabler/search-data.json';
import { TablerFilledIcons } from './library-tabler-filled';
import { TablerFilledIcon } from './library-tabler-filled';
import TablerFilledIconsSearchData from './library-tabler-filled/search-data.json';

registerIconLibraries({
	searchIndex2,
	libraries: {
		faregular: {
			icons: FaRegularIcons,
			searchData: FaRegularIconsSearchData,
			render: FaRegularIcon,
		},
		fabrands: {
			icons: FaBrandsIcons,
			searchData: FaBrandsIconsSearchData,
			render: FaBrandsIcon,
		},
		fasolid: {
			icons: FaSolidIcons,
			searchData: FaSolidIconsSearchData,
			render: FaSolidIcon,
		},
		essentials: {
			icons: EssentialsIcons,
			searchData: EssentialsIconsSearchData,
			render: EssentialsIcon,
		},
		feather: {
			icons: FeatherIcons,
			searchData: FeatherIconsSearchData,
			render: FeatherIcon,
		},
		lucide: {
			icons: LucideIcons,
			searchData: LucideIconsSearchData,
			render: LucideIcon,
		},
		untitledui: {
			icons: UntitleduiIcons,
			searchData: UntitleduiIconsSearchData,
			render: UntitleduiIcon,
		},
		tabler: {
			icons: TablerIcons,
			searchData: TablerIconsSearchData,
			render: TablerIcon,
		},
		'tabler-filled': {
			icons: TablerFilledIcons,
			searchData: TablerFilledIconsSearchData,
			render: TablerFilledIcon,
		},
	},
});
