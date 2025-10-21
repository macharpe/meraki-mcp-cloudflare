// src/services/merakiapi.ts - Meraki API Service Layer
import { APIError, MerakiError } from "../errors";
import type { Env } from "../types/env";
import type {
	ApplianceContentFiltering,
	ApplianceSecurityEvent,
	ApplianceTrafficShaping,
	ApplianceVpnSiteToSite,
	Client,
	Device,
	DeviceStatus,
	ManagementInterface,
	Network,
	NetworkEvent,
	NetworkTraffic,
	Organization,
	SwitchPort,
	SwitchPortStatus,
	SwitchRoutingInterface,
	SwitchStaticRoute,
	WirelessChannelUtilization,
	WirelessClientConnectivityEvent,
	WirelessConnectionStats,
	WirelessLatencyStats,
	WirelessRadioSettings,
	WirelessRfProfile,
	WirelessSignalQuality,
	WirelessStatus,
} from "../types/meraki";
import { CacheKeys, CacheService, CacheTTL } from "./cache";

export class MerakiAPIService {
	private apiKey: string;
	private baseUrl: string;
	private cache: CacheService | null;
	private env: Env | null;
	public cacheStatus: "HIT" | "MISS" = "MISS"; // Track last cache status for monitoring

	constructor(
		apiKey: string,
		baseUrl = "https://api.meraki.com/api/v1",
		env?: Env,
	) {
		if (!apiKey) {
			throw new MerakiError("MERAKI_API_KEY is required");
		}
		this.apiKey = apiKey;
		this.baseUrl = baseUrl;
		this.cache = env ? new CacheService(env) : null;
		this.env = env || null;
	}

	private async makeRequest<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers = {
			"X-Cisco-Meraki-API-Key": this.apiKey,
			"Content-Type": "application/json",
			...options.headers,
		};

		try {
			const response = await fetch(url, {
				...options,
				headers,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new APIError(
					`Meraki API Error: ${response.status} ${response.statusText}`,
					response.status,
					errorText,
				);
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			throw new MerakiError(
				`Network request failed for ${endpoint}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	// Organizations
	async getOrganizations(): Promise<Organization[]> {
		if (this.cache && this.env) {
			// Use Workers Cache API for maximum performance
			const result = await this.cache.getWithWorkersCache(
				CacheKeys.organizations(),
				() => this.makeRequest<Organization[]>("/organizations"),
				{ ttl: CacheTTL.ORGANIZATIONS(this.env) },
			);
			this.cacheStatus = result.cacheStatus;
			return result.data;
		}
		return this.makeRequest<Organization[]>("/organizations");
	}

	async getOrganization(organizationId: string): Promise<Organization> {
		return this.makeRequest<Organization>(`/organizations/${organizationId}`);
	}

	// Networks
	async getNetworks(organizationId: string): Promise<Network[]> {
		if (this.cache && this.env) {
			// Use Workers Cache API for maximum performance
			const result = await this.cache.getWithWorkersCache(
				CacheKeys.networks(organizationId),
				() =>
					this.makeRequest<Network[]>(
						`/organizations/${organizationId}/networks`,
					),
				{ ttl: CacheTTL.NETWORKS(this.env) },
			);
			this.cacheStatus = result.cacheStatus;
			return result.data;
		}
		return this.makeRequest<Network[]>(
			`/organizations/${organizationId}/networks`,
		);
	}

	async getNetwork(networkId: string): Promise<Network> {
		return this.makeRequest<Network>(`/networks/${networkId}`);
	}

	// Devices
	async getDevices(networkId: string): Promise<Device[]> {
		return this.makeRequest<Device[]>(`/networks/${networkId}/devices`);
	}

	async getDevice(serial: string): Promise<Device> {
		return this.makeRequest<Device>(`/devices/${serial}`);
	}

	async getDeviceStatuses(organizationId: string): Promise<DeviceStatus[]> {
		return this.makeRequest<DeviceStatus[]>(
			`/organizations/${organizationId}/devices/statuses`,
		);
	}

	// Clients
	async getClients(networkId: string, timespan = 86400): Promise<Client[]> {
		if (this.cache && this.env) {
			return this.cache.getOrSet(
				CacheKeys.clients(networkId, timespan),
				() => this.fetchAllClients(networkId, timespan),
				{ ttl: CacheTTL.CLIENTS },
			);
		}
		return this.fetchAllClients(networkId, timespan);
	}

	private async fetchAllClients(
		networkId: string,
		timespan: number,
	): Promise<Client[]> {
		const allClients: Client[] = [];
		let startingAfter: string | undefined;
		const perPage = 1000; // Maximum allowed by Meraki API

		while (true) {
			const params = new URLSearchParams({
				timespan: timespan.toString(),
				perPage: perPage.toString(),
			});

			if (startingAfter) {
				params.append("startingAfter", startingAfter);
			}

			const clients = await this.makeRequest<Client[]>(
				`/networks/${networkId}/clients?${params.toString()}`,
			);

			allClients.push(...clients);

			// If we got fewer than perPage clients, we've reached the end
			if (clients.length < perPage) {
				break;
			}

			// Use the last client's ID for pagination
			const lastClient = clients[clients.length - 1];
			if (lastClient?.id) {
				startingAfter = lastClient.id;
			} else {
				// Fallback to MAC address if ID is not available
				startingAfter = lastClient?.mac;
			}

			if (!startingAfter) {
				break;
			}
		}

		return allClients;
	}

	// Switch Ports
	async getSwitchPorts(serial: string): Promise<SwitchPort[]> {
		return this.makeRequest<SwitchPort[]>(`/devices/${serial}/switch/ports`);
	}

	async getSwitchPortStatuses(
		serial: string,
		timespan = 300,
	): Promise<SwitchPortStatus[]> {
		return this.makeRequest<SwitchPortStatus[]>(
			`/devices/${serial}/switch/ports/statuses?timespan=${timespan}`,
		);
	}

	// Device Management Interface
	async getManagementInterface(serial: string): Promise<ManagementInterface> {
		return this.makeRequest<ManagementInterface>(
			`/devices/${serial}/managementInterface`,
		);
	}

	// Wireless Access Point Methods
	async getWirelessRadioSettings(
		serial: string,
	): Promise<WirelessRadioSettings> {
		return this.makeRequest<WirelessRadioSettings>(
			`/devices/${serial}/wireless/radio/settings`,
		);
	}

	async getWirelessStatus(serial: string): Promise<WirelessStatus> {
		return this.makeRequest<WirelessStatus>(
			`/devices/${serial}/wireless/status`,
		);
	}

	async getWirelessLatencyStats(
		serial: string,
		timespan = 86400,
	): Promise<WirelessLatencyStats> {
		return this.makeRequest<WirelessLatencyStats>(
			`/devices/${serial}/wireless/latencyStats?timespan=${timespan}`,
		);
	}

	// Switch Routing
	async getSwitchRoutingInterfaces(
		serial: string,
	): Promise<SwitchRoutingInterface[]> {
		return this.makeRequest<SwitchRoutingInterface[]>(
			`/devices/${serial}/switch/routing/interfaces`,
		);
	}

	async getSwitchStaticRoutes(serial: string): Promise<SwitchStaticRoute[]> {
		return this.makeRequest<SwitchStaticRoute[]>(
			`/devices/${serial}/switch/routing/staticRoutes`,
		);
	}

	// Network Traffic and Performance
	async getNetworkTraffic(
		networkId: string,
		timespan = 86400,
	): Promise<NetworkTraffic[]> {
		return this.makeRequest<NetworkTraffic[]>(
			`/networks/${networkId}/traffic?timespan=${timespan}`,
		);
	}

	async getNetworkEvents(
		networkId: string,
		perPage = 10,
	): Promise<NetworkEvent[]> {
		return this.makeRequest<NetworkEvent[]>(
			`/networks/${networkId}/events?perPage=${perPage}`,
		);
	}

	// Appliance Management Methods
	async getApplianceVpnSiteToSite(
		networkId: string,
	): Promise<ApplianceVpnSiteToSite> {
		return this.makeRequest<ApplianceVpnSiteToSite>(
			`/networks/${networkId}/appliance/vpn/siteToSiteVpn`,
		);
	}

	async getApplianceContentFiltering(
		networkId: string,
	): Promise<ApplianceContentFiltering> {
		return this.makeRequest<ApplianceContentFiltering>(
			`/networks/${networkId}/appliance/contentFiltering`,
		);
	}

	async getApplianceSecurityEvents(
		networkId: string,
		timespan = 86400,
	): Promise<ApplianceSecurityEvent[]> {
		return this.makeRequest<ApplianceSecurityEvent[]>(
			`/networks/${networkId}/appliance/security/events?timespan=${timespan}`,
		);
	}

	async getApplianceTrafficShaping(
		networkId: string,
	): Promise<ApplianceTrafficShaping> {
		return this.makeRequest<ApplianceTrafficShaping>(
			`/networks/${networkId}/appliance/trafficShaping`,
		);
	}

	// Additional Wireless Management Methods
	async getWirelessRfProfiles(networkId: string): Promise<WirelessRfProfile[]> {
		return this.makeRequest<WirelessRfProfile[]>(
			`/networks/${networkId}/wireless/rfProfiles`,
		);
	}

	async getWirelessChannelUtilization(
		networkId: string,
		timespan = 86400,
	): Promise<WirelessChannelUtilization[]> {
		return this.makeRequest<WirelessChannelUtilization[]>(
			`/networks/${networkId}/wireless/channelUtilizationHistory?timespan=${timespan}`,
		);
	}

	async getWirelessSignalQuality(
		networkId: string,
		timespan = 86400,
	): Promise<WirelessSignalQuality[]> {
		return this.makeRequest<WirelessSignalQuality[]>(
			`/networks/${networkId}/wireless/signalQualityHistory?timespan=${timespan}`,
		);
	}

	async getWirelessConnectionStats(
		networkId: string,
		timespan = 86400,
	): Promise<WirelessConnectionStats> {
		return this.makeRequest<WirelessConnectionStats>(
			`/networks/${networkId}/wireless/connectionStats?timespan=${timespan}`,
		);
	}

	async getWirelessClientConnectivityEvents(
		networkId: string,
		clientId: string,
		timespan = 86400,
	): Promise<WirelessClientConnectivityEvent[]> {
		return this.makeRequest<WirelessClientConnectivityEvent[]>(
			`/networks/${networkId}/wireless/clients/${clientId}/connectivityEvents?timespan=${timespan}`,
		);
	}
}
