// src/types/meraki.ts - TypeScript type definitions
export interface Organization {
	id: string;
	name: string;
	url: string;
	api: {
		enabled: boolean;
	};
	licensing?: {
		model: string;
	};
	cloud?: {
		region: {
			name: string;
		};
	};
}

export interface Network {
	id: string;
	organizationId: string;
	name: string;
	productTypes: string[];
	timeZone: string;
	tags?: string[];
	enrollmentString?: string;
	url: string;
	notes?: string;
	isBoundToConfigTemplate?: boolean;
}

export interface Device {
	serial: string;
	mac: string;
	name?: string;
	model: string;
	networkId: string;
	productType: string;
	tags?: string[];
	lanIp?: string;
	firmware?: string;
	url: string;
	address?: string;
	lat?: number;
	lng?: number;
	notes?: string;
	details?: Array<{
		name: string;
		value: string;
	}>;
	switchProfileId?: string;
}

export interface DeviceStatus {
	serial: string;
	name?: string;
	status: "online" | "offline" | "alerting";
	lastReportedAt: string;
	networkId: string;
	productType: string;
	model: string;
	publicIp?: string;
	lanIp?: string;
	gateway?: string;
	ipType?: string;
	primaryDns?: string;
	secondaryDns?: string;
	components?: {
		powerSupplies?: Array<{
			slot: number;
			status: string;
		}>;
	};
}

export interface Client {
	id: string;
	mac: string;
	ip?: string;
	ip6?: string;
	description?: string;
	firstSeen: string;
	lastSeen: string;
	manufacturer?: string;
	os?: string;
	user?: string;
	vlan?: string;
	switchport?: string;
	wirelessCapabilities?: string;
	smInstalled?: boolean;
	recentDeviceMac?: string;
	status: "online" | "offline";
	usage: {
		sent: number;
		recv: number;
		total: number;
	};
	namedVlan?: string;
	adaptivePolicyGroup?: string;
	deviceTypePrediction?: string;
}

export interface SwitchPort {
	portId: string;
	name?: string;
	enabled: boolean;
	poeEnabled: boolean;
	type: "access" | "trunk";
	vlan?: number;
	voiceVlan?: number;
	allowedVlans?: string;
	isolationEnabled: boolean;
	rstpEnabled: boolean;
	stpGuard: "disabled" | "root guard" | "bpdu guard" | "loop guard";
	linkNegotiation?: string;
	portScheduleId?: string;
	udld?: string;
	accessPolicyType?: string;
	accessPolicyNumber?: number;
	macAllowList?: string[];
	stickyMacAllowList?: string[];
	stickyMacAllowListLimit?: number;
	stormControlEnabled?: boolean;
	adaptivePolicyGroupId?: string;
	peerSgtCapable?: boolean;
	flexibleStackingEnabled?: boolean;
	daiTrusted?: boolean;
	profile?: {
		enabled: boolean;
		id?: string;
		iname?: string;
	};
}

export interface SwitchPortStatus {
	portId: string;
	enabled: boolean;
	status: "connected" | "disconnected";
	speed?: string;
	duplex?: string;
	usageInKb?: {
		total: number;
		sent: number;
		recv: number;
	};
	cdp?: {
		systemName?: string;
		platform?: string;
		deviceId?: string;
		portId?: string;
		nativeVlan?: number;
		address?: string;
		managementAddress?: string;
		version?: string;
		vtpManagementDomain?: string;
		capabilities?: string;
	};
	lldp?: {
		systemName?: string;
		systemDescription?: string;
		chassisId?: string;
		portId?: string;
		managementVlan?: number;
		portVlan?: number;
		managementAddress?: string;
		portDescription?: string;
		systemCapabilities?: string;
	};
	clientCount?: number;
	powerUsageInWh?: number;
	trafficInKbps?: {
		total?: number;
		sent?: number;
		recv?: number;
	};
	securePort?: {
		enabled: boolean;
		active: boolean;
		authenticationStatus?: string;
		configOverrides?: {
			type?: string;
			vlan?: number;
			voiceVlan?: number;
		};
	};
}

// Additional interfaces for endpoints without specific types
export interface ManagementInterface {
	wan1?: {
		wanEnabled?: string;
		usingStaticIp?: boolean;
		staticIp?: string;
		staticSubnetMask?: string;
		staticGatewayIp?: string;
		staticDns?: string[];
		vlan?: number;
	};
	wan2?: {
		wanEnabled?: string;
		usingStaticIp?: boolean;
		staticIp?: string;
		staticSubnetMask?: string;
		staticGatewayIp?: string;
		staticDns?: string[];
		vlan?: number;
	};
}

export interface WirelessRadioSettings {
	rfProfileId?: string;
	channel?: number;
	channelWidth?: number;
	targetPower?: number;
	twoFourGhzSettings?: {
		maxPower?: number;
		minPower?: number;
		minBitrate?: number;
		validAutoChannels?: number[];
	};
	fiveGhzSettings?: {
		maxPower?: number;
		minPower?: number;
		minBitrate?: number;
		validAutoChannels?: number[];
	};
}

export interface WirelessStatus {
	basicServiceSets?: Array<{
		ssidName?: string;
		ssidNumber?: number;
		enabled?: boolean;
		band?: string;
		bssid?: string;
		channel?: number;
		channelWidth?: number;
		power?: number;
	}>;
}

export interface WirelessLatencyStats {
	serial?: string;
	networkId?: string;
	latencyStats?: Array<{
		timespan?: number;
		avgLatencyMs?: number;
	}>;
}

export interface SwitchRoutingInterface {
	interfaceId?: string;
	name?: string;
	subnet?: string;
	interfaceIp?: string;
	multicastRouting?: string;
	vlanId?: number;
	defaultGateway?: string;
	ospfSettings?: {
		area?: string;
		cost?: number;
		isPassiveEnabled?: boolean;
	};
}

export interface SwitchStaticRoute {
	routeId?: string;
	name?: string;
	subnet?: string;
	gatewayIp?: string;
	gatewayVlanId?: number;
	enabled?: boolean;
	fixedIpAssignments?: Array<{
		name?: string;
		ip?: string;
	}>;
	reservedIpRanges?: Array<{
		start?: string;
		end?: string;
		comment?: string;
	}>;
}

export interface NetworkTraffic {
	application?: string;
	destination?: string;
	protocol?: string;
	port?: number;
	recv?: number;
	sent?: number;
	numClients?: number;
	activeTime?: number;
	flows?: number;
}

export interface NetworkEvent {
	occurredAt?: string;
	networkId?: string;
	type?: string;
	description?: string;
	clientId?: string;
	clientDescription?: string;
	clientMac?: string;
	deviceSerial?: string;
	deviceName?: string;
	ssidNumber?: number;
	eventData?: Record<string, unknown>;
}

// Appliance Management Types
export interface ApplianceVpnSiteToSite {
	mode: "none" | "hub" | "spoke";
	hubs?: Array<{
		hubId: string;
		useDefaultRoute: boolean;
	}>;
	subnets?: Array<{
		localSubnet: string;
		useVpn: boolean;
	}>;
}

export interface ApplianceContentFiltering {
	allowedUrlPatterns?: string[];
	blockedUrlPatterns?: string[];
	blockedUrlCategories?: string[];
	urlCategoryListSize?: string;
}

export interface ApplianceSecurityEvent {
	ts: string;
	eventType: string;
	srcIp: string;
	destIp: string;
	protocol?: string;
	port?: number;
	blocked: boolean;
	ruleId?: string;
	message?: string;
}

export interface ApplianceTrafficShaping {
	globalBandwidthLimits?: {
		limitUp?: number;
		limitDown?: number;
	};
	rules?: Array<{
		definitions: Array<{
			type: string;
			value: string;
		}>;
		perClientBandwidthLimits?: {
			bandwidthLimits: {
				limitUp?: number;
				limitDown?: number;
			};
			settings: string;
		};
		dscpTagValue?: number;
		priority?: string;
	}>;
}

// Additional Wireless Management Types
export interface WirelessRfProfile {
	id: string;
	networkId: string;
	name: string;
	clientBalancingEnabled?: boolean;
	minBitrateType: string;
	bandSelectionType: string;
	apBandSettings?: {
		bandOperationMode: string;
		bands?: {
			enabled?: string[];
		};
	};
	twoFourGhzSettings?: {
		maxPower?: number;
		minPower?: number;
		minBitrate?: number;
		validAutoChannels?: number[];
		axEnabled?: boolean;
		rxsop?: number;
	};
	fiveGhzSettings?: {
		maxPower?: number;
		minPower?: number;
		minBitrate?: number;
		validAutoChannels?: number[];
		channelWidth?: string;
		rxsop?: number;
	};
	sixGhzSettings?: {
		maxPower?: number;
		minPower?: number;
		minBitrate?: number;
		validAutoChannels?: number[];
		channelWidth?: string;
		rxsop?: number;
	};
	transmission?: {
		enabled: boolean;
	};
	perSsidSettings?: {
		[key: string]: {
			minBitrate?: number;
			bandOperationMode?: string;
			bands?: {
				enabled?: string[];
			};
		};
	};
}

export interface WirelessChannelUtilization {
	startTs: string;
	endTs: string;
	utilizationTotal: number;
	utilization80211: number;
	utilizationNon80211: number;
}

export interface WirelessSignalQuality {
	startTs: string;
	endTs: string;
	rssi: number;
	snr: number;
}

export interface WirelessConnectionStats {
	assoc: number;
	auth: number;
	dhcp: number;
	dns: number;
	success: number;
}

export interface WirelessClientConnectivityEvent {
	occurredAt: string;
	deviceSerial: string;
	band: number;
	ssidNumber: number;
	type: string;
	details?: {
		rssi?: number;
		aid?: string;
		duration?: string;
	};
	eventData?: Record<string, unknown>;
}
