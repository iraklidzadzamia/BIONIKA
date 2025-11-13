"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  PhoneIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Country codes data with flags and dial codes - Georgia first
const COUNTRY_CODES = [
  { code: "GE", name: "Georgia", dialCode: "+995", flag: "🇬🇪" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "🇭🇷" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "🇸🇮" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "🇸🇰" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "🇱🇹" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "🇨🇾" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "🇲🇹" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "🇱🇺" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "🇮🇸" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "GY", name: "Guyana", dialCode: "+592", flag: "🇬🇾" },
  { code: "SR", name: "Suriname", dialCode: "+597", flag: "🇸🇷" },
  { code: "FK", name: "Falkland Islands", dialCode: "+500", flag: "🇫🇰" },
  { code: "GS", name: "South Georgia", dialCode: "+500", flag: "🇬🇸" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "🇪🇹" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "CI", name: "Ivory Coast", dialCode: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "TD", name: "Chad", dialCode: "+235", flag: "🇹🇩" },
  {
    code: "CF",
    name: "Central African Republic",
    dialCode: "+236",
    flag: "🇨🇫",
  },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "🇨🇲" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", flag: "🇬🇶" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "CG", name: "Republic of the Congo", dialCode: "+242", flag: "🇨🇬" },
  {
    code: "CD",
    name: "Democratic Republic of the Congo",
    dialCode: "+243",
    flag: "🇨🇩",
  },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", flag: "🇬🇼" },
  {
    code: "IO",
    name: "British Indian Ocean Territory",
    dialCode: "+246",
    flag: "🇮🇴",
  },
  { code: "AC", name: "Ascension Island", dialCode: "+247", flag: "🇦🇨" },
  { code: "SC", name: "Seychelles", dialCode: "+248", flag: "🇸🇨" },
  { code: "SD", name: "Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "RW", name: "Rwanda", dialCode: "+250", flag: "🇷🇼" },
  { code: "BI", name: "Burundi", dialCode: "+257", flag: "🇧🇮" },
  { code: "KM", name: "Comoros", dialCode: "+269", flag: "🇰🇲" },
  { code: "MG", name: "Madagascar", dialCode: "+261", flag: "🇲🇬" },
  { code: "RE", name: "Réunion", dialCode: "+262", flag: "🇷🇪" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼" },
  { code: "NA", name: "Namibia", dialCode: "+264", flag: "🇳🇦" },
  { code: "MW", name: "Malawi", dialCode: "+265", flag: "🇲🇼" },
  { code: "LS", name: "Lesotho", dialCode: "+266", flag: "🇱🇸" },
  { code: "BW", name: "Botswana", dialCode: "+267", flag: "🇧🇼" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", flag: "🇸🇿" },
  { code: "YT", name: "Mayotte", dialCode: "+262", flag: "🇾🇹" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "🇲🇺" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "🇸🇱" },
  { code: "GM", name: "Gambia", dialCode: "+220", flag: "🇬🇲" },
  { code: "GN", name: "Guinea", dialCode: "+224", flag: "🇬🇳" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Benin", dialCode: "+229", flag: "🇧🇯" },
  { code: "MR", name: "Mauritania", dialCode: "+222", flag: "🇲🇷" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "LY", name: "Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "EH", name: "Western Sahara", dialCode: "+212", flag: "🇪🇭" },
  { code: "SS", name: "South Sudan", dialCode: "+211", flag: "🇸🇸" },
  { code: "ER", name: "Eritrea", dialCode: "+291", flag: "🇪🇷" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", flag: "🇩🇯" },
  { code: "SO", name: "Somalia", dialCode: "+252", flag: "🇸🇴" },
  { code: "YE", name: "Yemen", dialCode: "+967", flag: "🇾🇪" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "SY", name: "Syria", dialCode: "+963", flag: "🇸🇾" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "MV", name: "Maldives", dialCode: "+960", flag: "🇲🇻" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "BT", name: "Bhutan", dialCode: "+975", flag: "🇧🇹" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" },
  { code: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "BN", name: "Brunei", dialCode: "+673", flag: "🇧🇳" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { code: "MO", name: "Macau", dialCode: "+853", flag: "🇲🇴" },
  { code: "MN", name: "Mongolia", dialCode: "+976", flag: "🇲🇳" },
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", flag: "🇰🇿" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998", flag: "🇺🇿" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996", flag: "🇰🇬" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992", flag: "🇹🇯" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993", flag: "🇹🇲" },
  { code: "AZ", name: "Azerbaijan", dialCode: "+994", flag: "🇦🇿" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "🇦🇲" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "PS", name: "Palestine", dialCode: "+970", flag: "🇵🇸" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "🇦🇱" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "🇲🇰" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "🇷🇸" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "🇲🇪" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "+387", flag: "🇧🇦" },
  { code: "XK", name: "Kosovo", dialCode: "+383", flag: "🇽🇰" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "🇲🇩" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "🇧🇾" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "🇲🇨" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "🇸🇲" },
  { code: "VA", name: "Vatican City", dialCode: "+379", flag: "🇻🇦" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "🇱🇮" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "🇦🇩" },
  { code: "GI", name: "Gibraltar", dialCode: "+350", flag: "🇬🇮" },
  { code: "FO", name: "Faroe Islands", dialCode: "+298", flag: "🇫🇴" },
  { code: "GL", name: "Greenland", dialCode: "+299", flag: "🇬🇱" },
  { code: "SJ", name: "Svalbard and Jan Mayen", dialCode: "+47", flag: "🇸🇯" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "FJ", name: "Fiji", dialCode: "+679", flag: "🇫🇯" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", flag: "🇵🇬" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677", flag: "🇸🇧" },
  { code: "VU", name: "Vanuatu", dialCode: "+678", flag: "🇻🇺" },
  { code: "NC", name: "New Caledonia", dialCode: "+687", flag: "🇳🇨" },
  { code: "PF", name: "French Polynesia", dialCode: "+689", flag: "🇵🇫" },
  { code: "TO", name: "Tonga", dialCode: "+676", flag: "🇹🇴" },
  { code: "WS", name: "Samoa", dialCode: "+685", flag: "🇼🇸" },
  { code: "KI", name: "Kiribati", dialCode: "+686", flag: "🇰🇮" },
  { code: "TV", name: "Tuvalu", dialCode: "+688", flag: "🇹🇻" },
  { code: "NR", name: "Nauru", dialCode: "+674", flag: "🇳🇷" },
  { code: "PW", name: "Palau", dialCode: "+680", flag: "🇵🇼" },
  { code: "MH", name: "Marshall Islands", dialCode: "+692", flag: "🇲🇭" },
  { code: "FM", name: "Micronesia", dialCode: "+691", flag: "🇫🇲" },
  { code: "GU", name: "Guam", dialCode: "+1", flag: "🇬🇺" },
  { code: "MP", name: "Northern Mariana Islands", dialCode: "+1", flag: "🇲🇵" },
  { code: "AS", name: "American Samoa", dialCode: "+1", flag: "🇦🇸" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1", flag: "🇵🇷" },
  { code: "VI", name: "U.S. Virgin Islands", dialCode: "+1", flag: "🇻🇮" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1", flag: "🇩🇴" },
  { code: "JM", name: "Jamaica", dialCode: "+1", flag: "🇯🇲" },
  { code: "BB", name: "Barbados", dialCode: "+1", flag: "🇧🇧" },
  { code: "GD", name: "Grenada", dialCode: "+1", flag: "🇬🇩" },
  { code: "LC", name: "Saint Lucia", dialCode: "+1", flag: "🇱🇨" },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines",
    dialCode: "+1",
    flag: "🇻🇨",
  },
  { code: "AG", name: "Antigua and Barbuda", dialCode: "+1", flag: "🇦🇬" },
  { code: "KN", name: "Saint Kitts and Nevis", dialCode: "+1", flag: "🇰🇳" },
  { code: "DM", name: "Dominica", dialCode: "+1", flag: "🇩🇲" },
  { code: "HT", name: "Haiti", dialCode: "+509", flag: "🇭🇹" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
  { code: "TC", name: "Turks and Caicos Islands", dialCode: "+1", flag: "🇹🇨" },
  { code: "KY", name: "Cayman Islands", dialCode: "+1", flag: "🇰🇾" },
  { code: "BM", name: "Bermuda", dialCode: "+1", flag: "🇧🇲" },
  { code: "AW", name: "Aruba", dialCode: "+297", flag: "🇦🇼" },
  { code: "CW", name: "Curaçao", dialCode: "+599", flag: "🇨🇼" },
  { code: "SX", name: "Sint Maarten", dialCode: "+1", flag: "🇸🇽" },
  { code: "BQ", name: "Caribbean Netherlands", dialCode: "+599", flag: "🇧🇶" },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "+1", flag: "🇹🇹" },
  { code: "GF", name: "French Guiana", dialCode: "+594", flag: "🇬🇫" },
  { code: "PA", name: "Panama", dialCode: "+507", flag: "🇵🇦" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "BZ", name: "Belize", dialCode: "+501", flag: "🇧🇿" },
];

const PhoneInput = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      required = false,
      placeholder = "Enter phone number",
      value = "",
      onChange,
      onValueChange,
      defaultCountry = "GE",
      showValidation = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(
      COUNTRY_CODES.find((c) => c.code === defaultCountry) || COUNTRY_CODES[0]
    );
    const [searchTerm, setSearchTerm] = useState("");

    // Phone validation
    const isValid = React.useMemo(() => {
      if (!showValidation || !value) return null;
      const digits = String(value).replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, [value, showValidation]);
    const dropdownRef = useRef(null);

    const baseClasses =
      "w-full px-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-300 text-base placeholder-neutral-400 bg-white shadow-sm hover:shadow-md";

    const errorClasses = error
      ? "border-red-300 focus:ring-red-100 focus:border-red-500 shadow-red-100"
      : "border-gray-200 hover:border-gray-300";

    const finalClasses = `${baseClasses} ${errorClasses} ${className}`;

    // Filter countries based on search
    const filteredCountries = COUNTRY_CODES.filter(
      (country) =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dialCode.includes(searchTerm) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getNationalDigitsFromValue = (val, country) => {
      if (!val) return "";
      if (typeof val === "string" && val.startsWith("+")) {
        const match = COUNTRY_CODES.find((c) => val.startsWith(c.dialCode));
        if (match) return val.slice(match.dialCode.length).replace(/\D/g, "");
        return val.replace(/^\+/, "").replace(/\D/g, "");
      }
      return String(val).replace(/\D/g, "");
    };

    // Format phone number based on country
    const formatPhoneNumber = (val, countryCode) => {
      const phoneNumber = String(val).replace(/\D/g, "");

      // Georgia formatting
      if (countryCode === "GE") {
        if (phoneNumber.length <= 3) return phoneNumber;
        if (phoneNumber.length <= 6)
          return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3)}`;
        return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(
          3,
          6
        )} ${phoneNumber.slice(6, 9)}`;
      }

      // US/Canada formatting
      if (countryCode === "US" || countryCode === "CA") {
        if (phoneNumber.length <= 3) return phoneNumber;
        if (phoneNumber.length <= 6)
          return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
          3,
          6
        )}-${phoneNumber.slice(6, 10)}`;
      }

      // UK formatting
      if (countryCode === "GB") {
        if (phoneNumber.length <= 4) return phoneNumber;
        if (phoneNumber.length <= 7)
          return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4)}`;
        return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(
          4,
          7
        )} ${phoneNumber.slice(7, 11)}`;
      }

      // Generic formatting for other countries
      if (phoneNumber.length <= 4) return phoneNumber;
      if (phoneNumber.length <= 8)
        return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4)}`;
      return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(
        4,
        8
      )} ${phoneNumber.slice(8, 12)}`;
    };

    const displayedValue = formatPhoneNumber(
      getNationalDigitsFromValue(value, selectedCountry),
      selectedCountry.code
    );

    const handleChange = (e) => {
      const inputValue = e.target.value;
      const formattedValue = formatPhoneNumber(
        inputValue,
        selectedCountry.code
      );
      const digits = String(inputValue).replace(/\D/g, "");
      const e164 = `${selectedCountry.dialCode}${digits}`;

      // Emit e164 value for backend storage
      if (onValueChange) {
        onValueChange(e164, {
          country: selectedCountry.code,
          dialCode: selectedCountry.dialCode,
          national: formattedValue,
          digits,
          e164,
        });
      }

      // Backward compatibility: emit formatted national via onChange
      if (onChange) {
        const newEvent = {
          ...e,
          target: { ...e.target, value: formattedValue },
        };
        onChange(newEvent);
      }
    };

    const handleCountrySelect = (country) => {
      setSelectedCountry(country);
      setIsOpen(false);
      setSearchTerm("");

      // Recompute e164 with new country for current digits
      const digits = getNationalDigitsFromValue(value, selectedCountry);
      const e164 = `${country.dialCode}${digits}`;
      if (onValueChange) {
        onValueChange(e164, {
          country: country.code,
          dialCode: country.dialCode,
          national: formatPhoneNumber(digits, country.code),
          digits,
          e164,
        });
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
          setSearchTerm("");
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1 leading-5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="flex items-stretch group">
          {/* Country Code Selector */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-3 px-4 h-12 border-2 border-r-0 border-gray-200 rounded-l-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <span className="text-xl filter drop-shadow-sm">
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                {selectedCountry.dialCode}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Enhanced Dropdown */}
            {isOpen && (
              <div className="absolute top-full left-0 z-50 w-96 max-h-96 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm bg-white/95">
                {/* Search Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    />
                  </div>
                </div>

                {/* Country List */}
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100 focus:bg-gradient-to-r focus:from-primary-50 focus:to-primary-100 focus:outline-none transition-all duration-200 ${
                        selectedCountry.code === country.code
                          ? "bg-gradient-to-r from-primary-100 to-primary-200 border-r-4 border-primary-500"
                          : ""
                      }`}
                    >
                      <span className="text-xl filter drop-shadow-sm">
                        {country.flag}
                      </span>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">
                          {country.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {country.code}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                        {country.dialCode}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-500 transition-colors duration-300">
              <PhoneIcon className="w-5 h-5" />
            </div>
            <input
              ref={ref}
              type="tel"
              className={`${finalClasses} pl-12 rounded-l-none h-12`}
              placeholder={placeholder}
              value={displayedValue}
              onChange={handleChange}
              {...props}
            />
          </div>
        </div>

        {isValid !== null && !error && (
          <div
            className={`mt-2 text-xs flex items-center gap-1 ${
              isValid ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {isValid ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Valid phone number
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Enter a valid phone number
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2 animate-fade-in">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;
