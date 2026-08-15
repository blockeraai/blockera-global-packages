// @flow

const DEFAULT_STATE = {
	products: {},
};

export const reducer = (
	state: Object = DEFAULT_STATE,
	action: Object
): Object => {
	switch (action?.type) {
		case 'REGISTER_PRODUCT':
			if (!action.product?.slug) {
				return state;
			}

			return {
				...state,
				products: {
					...state.products,
					[action.product.slug]: action.product,
				},
			};

		case 'REGISTER_PRODUCTS':
			return {
				...state,
				products: {
					...state.products,
					...(action.products || {}),
				},
			};

		case 'UNREGISTER_PRODUCT': {
			if (!state.products[action.slug]) {
				return state;
			}

			const products = { ...state.products };
			delete products[action.slug];

			return {
				...state,
				products,
			};
		}
	}

	return state;
};

export default reducer;
