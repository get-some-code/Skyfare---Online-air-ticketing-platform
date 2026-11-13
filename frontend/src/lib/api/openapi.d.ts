export interface paths {
    "/api/v1/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Describe the versioned API */
        get: operations["api_root_api_v1__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Check process liveness */
        get: operations["health_check_api_v1_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Check service readiness */
        get: operations["readiness_check_api_v1_ready_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register */
        post: operations["register_api_v1_auth_register_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["login_api_v1_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Refresh */
        post: operations["refresh_api_v1_auth_refresh_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["logout_api_v1_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Me */
        get: operations["me_api_v1_auth_me_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Me */
        patch: operations["update_me_api_v1_auth_me_patch"];
        trace?: never;
    };
    "/api/v1/auth/membership": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Membership */
        get: operations["membership_api_v1_auth_membership_get"];
        put?: never;
        /** Join Membership */
        post: operations["join_membership_api_v1_auth_membership_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/airports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Airports */
        get: operations["airports_api_v1_airports_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/destinations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Destinations */
        get: operations["destinations_api_v1_destinations_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/flights/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search Flights */
        get: operations["search_flights_api_v1_flights_search_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Bookings */
        get: operations["list_bookings_api_v1_bookings_get"];
        put?: never;
        /** Create Booking */
        post: operations["create_booking_api_v1_bookings_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/{reference}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Booking */
        get: operations["get_booking_api_v1_bookings__reference__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/bookings/{reference}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cancel Booking */
        post: operations["cancel_booking_api_v1_bookings__reference__cancel_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AirlineSummary */
        AirlineSummary: {
            /** Code */
            code: string;
            /** Name */
            name: string;
        };
        /** AirportPublic */
        AirportPublic: {
            /** Code */
            code: string;
            /** City */
            city: string;
            /** Name */
            name: string;
            /** Country */
            country: string;
            /** Category */
            category?: string | null;
            /** Subtitle */
            subtitle?: string | null;
            /** Tag */
            tag?: string | null;
            /** Image Path */
            image_path?: string | null;
            /** Sample Fare Inr */
            sample_fare_inr?: string | null;
            /** Sample Fare Usd */
            sample_fare_usd?: string | null;
        };
        /** AirportSummary */
        AirportSummary: {
            /** Code */
            code: string;
            /** City */
            city: string;
            /** Name */
            name: string;
        };
        /** AuthResponse */
        AuthResponse: {
            user: components["schemas"]["UserPublic"];
            tokens: components["schemas"]["TokenPair"];
        };
        /** BookingCreate */
        BookingCreate: {
            /** Fare Ids */
            fare_ids: string[];
            /** Passengers */
            passengers: components["schemas"]["PassengerCreate"][];
            /**
             * Currency
             * @default INR
             * @enum {string}
             */
            currency: "INR" | "USD";
            /**
             * Trip Type
             * @default one-way
             * @enum {string}
             */
            trip_type: "one-way" | "round-trip" | "multi-city";
            /**
             * Corporate Travel
             * @default false
             */
            corporate_travel: boolean;
        };
        /** BookingPublic */
        BookingPublic: {
            /** Reference */
            reference: string;
            /**
             * Status
             * @enum {string}
             */
            status: "reserved" | "cancelled";
            /**
             * Payment Status
             * @constant
             */
            payment_status: "unpaid";
            /**
             * Trip Type
             * @enum {string}
             */
            trip_type: "one-way" | "round-trip" | "multi-city";
            /** Cabin */
            cabin: string;
            /**
             * Currency
             * @enum {string}
             */
            currency: "INR" | "USD";
            /** Total Amount */
            total_amount: string;
            /** Traveller Count */
            traveller_count: number;
            /** Corporate Travel */
            corporate_travel: boolean;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /** Cancelled At */
            cancelled_at?: string | null;
            /** Segments */
            segments: components["schemas"]["SegmentPublic"][];
            /** Passengers */
            passengers: components["schemas"]["PassengerPublic"][];
        };
        /** FlightOffer */
        FlightOffer: {
            /**
             * Fare Id
             * Format: uuid
             */
            fare_id: string;
            /**
             * Flight Id
             * Format: uuid
             */
            flight_id: string;
            /** Flight Number */
            flight_number: string;
            airline: components["schemas"]["AirlineSummary"];
            origin: components["schemas"]["AirportSummary"];
            destination: components["schemas"]["AirportSummary"];
            /**
             * Depart At
             * Format: date-time
             */
            depart_at: string;
            /**
             * Arrive At
             * Format: date-time
             */
            arrive_at: string;
            /**
             * Depart On
             * Format: date
             */
            depart_on: string;
            /** Duration Minutes */
            duration_minutes: number;
            /** Stops */
            stops: number;
            /** Aircraft */
            aircraft: string;
            /**
             * Cabin
             * @enum {string}
             */
            cabin: "economy" | "premium_economy" | "business" | "first";
            /** Seats Available */
            seats_available: number;
            price: components["schemas"]["Money"];
            /**
             * Source
             * @default catalog
             * @enum {string}
             */
            source: "market" | "catalog";
            /** Detail */
            detail?: string | null;
            /** Airline Logo */
            airline_logo?: string | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** LoginRequest */
        LoginRequest: {
            /** Email */
            email: string;
            /** Password */
            password: string;
        };
        /** MembershipPublic */
        MembershipPublic: {
            /** Tier */
            tier: string;
            /** Miles */
            miles: number;
            /**
             * Joined At
             * Format: date-time
             */
            joined_at: string;
            /** Benefits */
            benefits: string[];
        };
        /** Money */
        Money: {
            /**
             * Currency
             * @enum {string}
             */
            currency: "INR" | "USD";
            /** Amount */
            amount: string;
            /** Total */
            total: string;
        };
        /** PassengerCreate */
        PassengerCreate: {
            /** Full Name */
            full_name: string;
            /** Date Of Birth */
            date_of_birth?: string | null;
        };
        /** PassengerPublic */
        PassengerPublic: {
            /** Full Name */
            full_name: string;
            /** Date Of Birth */
            date_of_birth?: string | null;
        };
        /** ProfileUpdate */
        ProfileUpdate: {
            /** Full Name */
            full_name?: string | null;
            /** Phone */
            phone?: string | null;
            /** Company Name */
            company_name?: string | null;
            /** Gstin */
            gstin?: string | null;
        };
        /** RefreshRequest */
        RefreshRequest: {
            /** Refresh Token */
            refresh_token: string;
        };
        /** RegisterRequest */
        RegisterRequest: {
            /** Full Name */
            full_name: string;
            /** Email */
            email: string;
            /** Password */
            password: string;
            /** Phone */
            phone?: string | null;
        };
        /** SearchCriteria */
        SearchCriteria: {
            /** Origin */
            origin: string;
            /** Destination */
            destination: string;
            /** Via */
            via?: string | null;
            /**
             * Departure
             * Format: date
             */
            departure: string;
            /** Return Date */
            return_date?: string | null;
            /**
             * Trip Type
             * @enum {string}
             */
            trip_type: "one-way" | "round-trip" | "multi-city";
            /**
             * Cabin
             * @enum {string}
             */
            cabin: "economy" | "premium_economy" | "business" | "first";
            /** Travellers */
            travellers: number;
            /** Direct Only */
            direct_only: boolean;
            /** Flexible Dates */
            flexible_dates: boolean;
            /**
             * Currency
             * @enum {string}
             */
            currency: "INR" | "USD";
            /**
             * Sort
             * @enum {string}
             */
            sort: "cheapest" | "fastest" | "best" | "departure";
        };
        /** SearchResponse */
        SearchResponse: {
            criteria: components["schemas"]["SearchCriteria"];
            /** Outbound */
            outbound: components["schemas"]["FlightOffer"][];
            /** Inbound */
            inbound?: components["schemas"]["FlightOffer"][] | null;
            /** Onward */
            onward?: components["schemas"]["FlightOffer"][] | null;
            /**
             * Source
             * @default catalog
             * @enum {string}
             */
            source: "market" | "catalog";
            /** Notice */
            notice?: string | null;
        };
        /** SegmentPublic */
        SegmentPublic: {
            /** Leg Order */
            leg_order: number;
            /** Flight Number */
            flight_number: string;
            /** Airline Name */
            airline_name: string;
            /** Origin Code */
            origin_code: string;
            /** Destination Code */
            destination_code: string;
            /**
             * Depart At
             * Format: date-time
             */
            depart_at: string;
            /**
             * Arrive At
             * Format: date-time
             */
            arrive_at: string;
            /** Cabin */
            cabin: string;
            /** Unit Amount */
            unit_amount: string;
            /** Line Amount */
            line_amount: string;
        };
        /** TokenPair */
        TokenPair: {
            /** Access Token */
            access_token: string;
            /** Refresh Token */
            refresh_token: string;
            /**
             * Token Type
             * @default bearer
             */
            token_type: string;
            /** Expires In */
            expires_in: number;
        };
        /** UserPublic */
        UserPublic: {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Email */
            email: string;
            /** Full Name */
            full_name: string;
            /** Phone */
            phone?: string | null;
            /** Company Name */
            company_name?: string | null;
            /** Gstin */
            gstin?: string | null;
            /** Role */
            role: string;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    api_root_api_v1__get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    health_check_api_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    readiness_check_api_v1_ready_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: string;
                    };
                };
            };
        };
    };
    register_api_v1_auth_register_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    login_api_v1_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    refresh_api_v1_auth_refresh_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TokenPair"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    logout_api_v1_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    me_api_v1_auth_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPublic"];
                };
            };
        };
    };
    update_me_api_v1_auth_me_patch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPublic"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    membership_api_v1_auth_membership_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipPublic"];
                };
            };
        };
    };
    join_membership_api_v1_auth_membership_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MembershipPublic"];
                };
            };
        };
    };
    airports_api_v1_airports_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AirportPublic"][];
                };
            };
        };
    };
    destinations_api_v1_destinations_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AirportPublic"][];
                };
            };
        };
    };
    search_flights_api_v1_flights_search_get: {
        parameters: {
            query: {
                origin: string;
                destination: string;
                departure: string;
                return?: string | null;
                via?: string | null;
                tripType?: string;
                cabin?: string;
                travellers?: number;
                directOnly?: boolean;
                flexibleDates?: boolean;
                currency?: "INR" | "USD";
                sort?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchResponse"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_bookings_api_v1_bookings_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingPublic"][];
                };
            };
        };
    };
    create_booking_api_v1_bookings_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BookingCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingPublic"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_booking_api_v1_bookings__reference__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                reference: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingPublic"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    cancel_booking_api_v1_bookings__reference__cancel_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                reference: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookingPublic"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
